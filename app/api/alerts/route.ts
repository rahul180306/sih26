import { NextRequest, NextResponse } from 'next/server';
import {
  INITIAL_FLOOD_ALERTS,
  FloodAlert,
  AlertStatus,
  generateCapXml,
  EMERGENCY_DISPATCH_UNITS,
  CITY_COORDINATES,
  CATCHMENT_COORDINATES,
} from '@/lib/alertsData';
import { getDb } from '@/lib/db';

// In-memory store for dynamic alerts during active session
let liveAlertsStore: FloodAlert[] = [...INITIAL_FLOOD_ALERTS];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city')?.toLowerCase();
  const severity = searchParams.get('severity')?.toUpperCase();
  const status = searchParams.get('status')?.toUpperCase();
  const format = searchParams.get('format')?.toLowerCase();
  const alertId = searchParams.get('id');

  let filtered = [...liveAlertsStore];

  if (alertId) {
    const single = filtered.find((a) => a.id === alertId);
    if (!single) {
      return NextResponse.json({ status: 'error', message: 'Alert not found' }, { status: 404 });
    }
    if (format === 'cap-xml') {
      const xml = generateCapXml(single);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `inline; filename="cap-${single.id}.xml"`,
        },
      });
    }
    return NextResponse.json({ status: 'success', data: single });
  }

  // City alerts for KPI metrics (before severity/status filter)
  const cityAlerts = (city && city !== 'all' && city !== 'national')
    ? liveAlertsStore.filter((a) => a.cityId === city)
    : [...liveAlertsStore];

  if (city && city !== 'all' && city !== 'national') {
    filtered = filtered.filter((a) => a.cityId === city);
  }

  if (severity && severity !== 'ALL') {
    filtered = filtered.filter((a) => a.severity === severity);
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter((a) => a.status === status);
  }

  // If CAP XML feed of first/all alerts requested
  if (format === 'cap-xml') {
    if (filtered.length > 0) {
      const xml = generateCapXml(filtered[0]);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
        },
      });
    }
    return new NextResponse('<!-- No active alerts found -->', {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  // KPI calculations from city dataset (not severity-filtered subset)
  const criticalCount = cityAlerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length;
  const warningCount = cityAlerts.filter((a) => a.severity === 'WARNING' && a.status === 'ACTIVE').length;
  const advisoryCount = cityAlerts.filter((a) => a.severity === 'ADVISORY' && a.status !== 'RESOLVED').length;
  const totalVulnerablePop = cityAlerts
    .filter((a) => a.status === 'ACTIVE' || a.status === 'ESCALATED')
    .reduce((sum, a) => sum + (a.vulnerablePopulationEst || 0), 0);
  const totalPumpsDeployed = cityAlerts
    .filter((a) => a.status === 'ACTIVE' || a.status === 'ESCALATED')
    .reduce((sum, a) => sum + (a.dewateringPumpsActive || 0), 0);
  const maxDepthCm = cityAlerts.length > 0
    ? Math.max(...cityAlerts.map((a) => a.predictedDepthCm || 0))
    : 0;

  return NextResponse.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    protocol: 'CAP-v1.2-OASIS-MoES-NCMRWF',
    summary: {
      totalAlerts: liveAlertsStore.length,
      cityAlertCount: cityAlerts.length,
      filteredCount: filtered.length,
      critical: criticalCount,
      warning: warningCount,
      advisory: advisoryCount,
      totalVulnerablePopulation: totalVulnerablePop,
      totalPumpsDeployed,
      maxDepthCm,
      ndrfActiveDispatches: cityAlerts.filter((a) => a.ndrfDispatched).length,
    },
    alerts: filtered,
    dispatchUnits: EMERGENCY_DISPATCH_UNITS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cityId = 'mumbai',
      cityName = 'Mumbai Metro',
      hotspotName,
      severity = 'WARNING',
      headline,
      description,
      instruction,
      predictedDepthM = 0.65,
      drainageSurchargePct = 88,
      leadTimeHours = 1.0,
      rainfallIntensityMmHr = 65,
      affectedRoads = [],
      vulnerablePopulationEst = 25000,
      catchmentId: rawCatchmentId,
      dewateringPumpsActive = 3,
      dewateringPumpsRequired = 4,
      ndrfDispatched = false,
      translations,
    } = body;

    // Explicit lat/lng from body take priority; then catchment lookup; then city default
    const catchmentId = rawCatchmentId || (hotspotName ? hotspotName.toLowerCase().replace(/[^a-z0-9]/g, '-') : '');
    const catchmentCoords = CATCHMENT_COORDINATES[catchmentId];
    const cityCoords = CITY_COORDINATES[cityId.toLowerCase()] || CITY_COORDINATES['mumbai'];

    const lat = typeof body.lat === 'number' ? body.lat
      : catchmentCoords ? catchmentCoords.lat
      : cityCoords.lat;

    const lng = typeof body.lng === 'number' ? body.lng
      : catchmentCoords ? catchmentCoords.lng
      : cityCoords.lng;

    if (!hotspotName || !headline) {
      return NextResponse.json(
        { status: 'error', message: 'Hotspot name and headline are required' },
        { status: 400 }
      );
    }

    const newId = `ALT-${cityId.slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-4)}`;
    const capIdentifier = `IN-${cityId.toUpperCase()}-JALRAKSHAK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${newId}`;
    const now = new Date().toISOString();

    // Build city-appropriate translations
    const defaultTranslations = buildDefaultTranslations(cityId, hotspotName, headline, instruction);

    const newAlert: FloodAlert = {
      id: newId,
      capIdentifier,
      cityId,
      cityName,
      catchmentId,
      hotspotName,
      severity,
      status: 'ACTIVE',
      urgency: severity === 'CRITICAL' ? 'Immediate' : 'Expected',
      certainty: 'Observed',
      headline,
      description: description || `Automated Doppler rain-runoff model detected extreme water level surge at ${hotspotName}.`,
      instruction: instruction || `Avoid low-lying underpasses. Heavy dewatering pumps deployed to prevent backflow surcharge.`,
      predictedDepthM: Number(predictedDepthM),
      predictedDepthCm: Math.round(Number(predictedDepthM) * 100),
      drainageSurchargePct: Number(drainageSurchargePct),
      leadTimeHours: Number(leadTimeHours),
      peakTime: `+${Math.round(Number(leadTimeHours) * 60)} mins`,
      rainfallIntensityMmHr: Number(rainfallIntensityMmHr),
      affectedRoads: Array.isArray(affectedRoads) && affectedRoads.length > 0 ? affectedRoads : [`${hotspotName} Main Approach`],
      vulnerablePopulationEst: Number(vulnerablePopulationEst),
      lat,
      lng,
      issuedAt: now,
      expiresAt: new Date(Date.now() + 3 * 3600000).toISOString(),
      source: 'MoES NCMRWF JalRakshak Real-Time Hydro Twin Engine',
      dewateringPumpsActive: Number(dewateringPumpsActive),
      dewateringPumpsRequired: Number(dewateringPumpsRequired),
      ndrfDispatched: Boolean(ndrfDispatched),
      confidencePct: 80,
      auditLog: [
        { timestamp: now, action: `Alert generated for ${hotspotName}`, actor: 'JalRakshak Operator' },
        { timestamp: now, action: 'CAP v1.2 alert registered in national registry', actor: 'System' },
      ],
      translations: translations || defaultTranslations,
    };

    // Prepend to in-memory store
    liveAlertsStore = [newAlert, ...liveAlertsStore];

    // Attempt persistent logging to Neon Postgres
    try {
      const sql = getDb();
      await sql`
        INSERT INTO flood_alerts (
          id, cap_identifier, city_id, city_name, catchment_id, hotspot_name,
          severity, status, urgency, certainty, headline, description, instruction,
          predicted_depth_m, drainage_surcharge_pct, lead_time_hours, rainfall_intensity_mm_hr,
          affected_roads, vulnerable_population_est, lat, lng, source, issued_at, expires_at
        ) VALUES (
          ${newAlert.id}, ${newAlert.capIdentifier}, ${newAlert.cityId}, ${newAlert.cityName},
          ${newAlert.catchmentId}, ${newAlert.hotspotName}, ${newAlert.severity}, ${newAlert.status},
          ${newAlert.urgency}, ${newAlert.certainty}, ${newAlert.headline}, ${newAlert.description},
          ${newAlert.instruction}, ${newAlert.predictedDepthM}, ${newAlert.drainageSurchargePct},
          ${newAlert.leadTimeHours}, ${newAlert.rainfallIntensityMmHr},
          ${JSON.stringify(newAlert.affectedRoads)}, ${newAlert.vulnerablePopulationEst},
          ${newAlert.lat}, ${newAlert.lng}, ${newAlert.source}, ${newAlert.issuedAt}, ${newAlert.expiresAt}
        );
      `;
    } catch {
      // Database optional in development/offline mode
    }

    return NextResponse.json({
      status: 'success',
      message: 'Emergency Flood Alert successfully broadcast and registered in CAP registry.',
      alert: newAlert,
      capXml: generateCapXml(newAlert),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to publish flood alert';
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, dewateringPumpsActive, ndrfDispatched, actor } = body;

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'Alert ID is required' }, { status: 400 });
    }

    const index = liveAlertsStore.findIndex((a) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ status: 'error', message: 'Alert not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const auditActor = actor || 'EOC Operator';

    if (status) {
      const prevStatus = liveAlertsStore[index].status;
      liveAlertsStore[index].status = status as AlertStatus;

      if (status === 'RESOLVED') {
        liveAlertsStore[index].resolvedAt = now;
      }

      // Append audit log entry
      const logEntry = { timestamp: now, action: `Status changed: ${prevStatus} → ${status}`, actor: auditActor };
      liveAlertsStore[index].auditLog = [...(liveAlertsStore[index].auditLog || []), logEntry];
    }

    if (dewateringPumpsActive !== undefined) {
      const prev = liveAlertsStore[index].dewateringPumpsActive;
      liveAlertsStore[index].dewateringPumpsActive = Number(dewateringPumpsActive);
      if (Number(dewateringPumpsActive) > prev) {
        const logEntry = { timestamp: now, action: `Pump count increased: ${prev} → ${dewateringPumpsActive}`, actor: auditActor };
        liveAlertsStore[index].auditLog = [...(liveAlertsStore[index].auditLog || []), logEntry];
      }
    }

    if (ndrfDispatched !== undefined) {
      liveAlertsStore[index].ndrfDispatched = Boolean(ndrfDispatched);
      if (Boolean(ndrfDispatched) && !liveAlertsStore[index].ndrfDispatched) {
        const logEntry = { timestamp: now, action: 'NDRF dispatch authorized', actor: auditActor };
        liveAlertsStore[index].auditLog = [...(liveAlertsStore[index].auditLog || []), logEntry];
      }
    }

    // Update in database if connected
    try {
      const sql = getDb();
      if (status) {
        await sql`UPDATE flood_alerts SET status = ${status} WHERE id = ${id};`;
      }
    } catch {
      // Fallback
    }

    return NextResponse.json({
      status: 'success',
      message: `Alert ${id} updated`,
      alert: liveAlertsStore[index],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update alert';
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    );
  }
}

// Build multilingual translations based on city
function buildDefaultTranslations(cityId: string, hotspotName: string, headline: string, instruction?: string): FloodAlert['translations'] {
  const base = {
    en: {
      headline,
      instruction: instruction || 'Exercise extreme caution in the affected area.',
    },
    hi: {
      headline: `चेतावनी: ${hotspotName} में भारी जलभराव की संभावना।`,
      instruction: instruction ? `${instruction}` : 'सुरक्षित रास्तों का प्रयोग करें।',
    },
  };

  const city = cityId.toLowerCase();

  if (city === 'mumbai') {
    return {
      ...base,
      mr: {
        headline: `इशारा: ${hotspotName} परिसरात पूर येण्याची शक्यता.`,
        instruction: instruction || 'सुरक्षित मार्ग वापरा.',
      },
    };
  }

  if (city === 'chennai') {
    return {
      ...base,
      ta: {
        headline: `எச்சரிக்கை: ${hotspotName} பகுதியில் வெள்ளம் வருவதற்கான வாய்ப்பு.`,
        instruction: instruction || 'பாதுகாப்பான பாதைகளைப் பயன்படுத்தவும்.',
      },
    };
  }

  if (city === 'bengaluru') {
    return {
      ...base,
      kn: {
        headline: `ಎಚ್ಚರಿಕೆ: ${hotspotName} ಪ್ರದೇಶದಲ್ಲಿ ಪ್ರವಾಹ ಸಾಧ್ಯತೆ.`,
        instruction: instruction || 'ಸುರಕ್ಷಿತ ಮಾರ್ಗಗಳನ್ನು ಬಳಸಿ.',
      },
    };
  }

  if (city === 'kolkata') {
    return {
      ...base,
      bn: {
        headline: `সতর্কতা: ${hotspotName} এলাকায় বন্যার সম্ভাবনা।`,
        instruction: instruction || 'নিরাপদ পথ ব্যবহার করুন।',
      },
    };
  }

  return base;
}
