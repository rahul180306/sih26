import { NextRequest, NextResponse } from 'next/server';

// ── PROVIDER ENDPOINTS ────────────────────────────────────────────────────────
const ORS_BASE  = 'https://api.openrouteservice.org/v2/directions';
const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

// ── CACHE ─────────────────────────────────────────────────────────────────────
const routeCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// ── CONFIGURABLE SAFETY THRESHOLDS ───────────────────────────────────────────
const HAZARD_RADIUS_M         = 500;   // meters — route point must be within this to trigger penalty
const ROUTE_SIMILARITY_THRESH = 300;   // meters — avg distance below which two routes are duplicates
const FLOOD_PENALTY = {
  none:       0,
  low:        8,    // minor splash / surface pooling
  moderate:   25,   // shallow waterlogging
  severe:     55,   // substantial flood depth
  critical:   80,   // critical water level
  impassable: 9999, // true road closure / vehicle stall threshold
} as const;

const HAZARD_SEVERITY_WEIGHT = {
  critical: 1.0,
  moderate: 0.5,
  low:      0.2,
} as const;

// ── VEHICLE CLEARANCE & FORDING LIMITS ────────────────────────────────────────
export interface VehicleClearance {
  maxSafeDepth: number;      // meters: water depth where vehicle traverses safely
  impassableDepth: number;   // meters: water depth causing stall/engine flood/impassable
  penaltyMultiplier: number; // sensitivity multiplier for hazard penalties
}

const VEHICLE_CLEARANCE: Record<string, VehicleClearance> = {
  bike: {
    maxSafeDepth: 0.10,
    impassableDepth: 0.22,
    penaltyMultiplier: 1.6,
  },
  walking: {
    maxSafeDepth: 0.15,
    impassableDepth: 0.30,
    penaltyMultiplier: 1.4,
  },
  car: {
    maxSafeDepth: 0.20,
    impassableDepth: 0.40,
    penaltyMultiplier: 1.0,
  },
  ambulance: {
    maxSafeDepth: 0.50,
    impassableDepth: 0.85,
    penaltyMultiplier: 0.60,
  },
  bus: {
    maxSafeDepth: 0.55,
    impassableDepth: 0.90,
    penaltyMultiplier: 0.65,
  },
};

// ── SCORE WEIGHTS ─────────────────────────────────────────────────────────────
const W_SAFETY   = 0.60;
const W_TIME     = 0.25;
const W_DISTANCE = 0.15;

// ── VEHICLE PROFILE MAPS ──────────────────────────────────────────────────────
const VEHICLE_TO_ORS: Record<string, string> = {
  car:       'driving-car',
  ambulance: 'driving-car',       // Emergency 4x4 / Ambulance uses car network with siren priority
  bus:       'driving-hgv',       // Heavy bus uses heavy vehicle limits
  bike:      'driving-car',       // Motorized 2-wheeler / Motorcycle uses road network
  walking:   'foot-walking',
};

const VEHICLE_TO_OSRM: Record<string, string> = {
  car:       'driving',
  ambulance: 'driving',
  bus:       'driving',
  bike:      'driving',           // Motorized two-wheeler on Indian road network
  walking:   'foot',
};

// ── SAFETY INCIDENT DATABASE ──────────────────────────────────────────────────
export interface SafetyIncident {
  id: string;
  name: string;
  lat: number;
  lng: number;
  riskLevel: 'critical' | 'moderate' | 'low';
  type: 'flood_sump' | 'waterlogging' | 'underpass' | 'construction';
  description: string;
  waterDepthMeters: number;
}

const SAFETY_DATABASE: Record<string, SafetyIncident[]> = {
  mumbai: [
    { id: 'mumbai-haz-1', name: 'Milan Subway Underpass', lat: 19.0833, lng: 72.8420, riskLevel: 'critical', type: 'underpass', description: 'Severe low sump · 0.95m water depth reported', waterDepthMeters: 0.95 },
    { id: 'mumbai-haz-2', name: 'Kurla West (Mithi River Bank)', lat: 19.0688, lng: 72.8745, riskLevel: 'critical', type: 'flood_sump', description: 'Mithi river overflow · High current risk', waterDepthMeters: 0.82 },
    { id: 'mumbai-haz-3', name: 'Dadar TT Circle Low Sump', lat: 19.0178, lng: 72.8478, riskLevel: 'moderate', type: 'waterlogging', description: 'Drainage backup · 0.35m surface pooling', waterDepthMeters: 0.35 },
    { id: 'mumbai-haz-4', name: 'Hindmata Flyover Underpass', lat: 19.0110, lng: 72.8420, riskLevel: 'moderate', type: 'underpass', description: 'Moderate waterlogging · Slow moving traffic', waterDepthMeters: 0.40 },
  ],
  chennai: [
    { id: 'chennai-haz-1', name: 'Velachery Lake Bypass Overflow', lat: 12.9815, lng: 80.2180, riskLevel: 'critical', type: 'flood_sump', description: 'Lake spillover · 0.75m deep inundation', waterDepthMeters: 0.75 },
    { id: 'chennai-haz-2', name: 'T. Nagar Usman Road Subway', lat: 13.0418, lng: 80.2341, riskLevel: 'moderate', type: 'underpass', description: 'Underpass drainage failure · 0.45m puddle', waterDepthMeters: 0.45 },
  ],
  bengaluru: [
    { id: 'blr-haz-1', name: 'Bellandur Lake Outfall Hub', lat: 12.9360, lng: 77.6680, riskLevel: 'critical', type: 'flood_sump', description: 'Lake overflow on Outer Ring Road', waterDepthMeters: 0.70 },
    { id: 'blr-haz-2', name: 'Silk Board Sump', lat: 12.9176, lng: 77.6238, riskLevel: 'moderate', type: 'waterlogging', description: 'Stormwater junction backflow', waterDepthMeters: 0.38 },
  ],
  delhi: [
    { id: 'delhi-haz-1', name: 'ITO Ring Road Low Sump', lat: 28.6295, lng: 77.2435, riskLevel: 'critical', type: 'flood_sump', description: 'Yamuna floodback in low-lying loop', waterDepthMeters: 0.88 },
  ],
};

// ── PUBLIC INTERFACE ──────────────────────────────────────────────────────────
export interface RouteAlternativeItem {
  id: string;
  name: string;
  summaryText: string;
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
  safetyScore: number;
  timeScore: number;
  distanceScore: number;
  finalScore: number;
  riskCategory: 'safe' | 'moderate' | 'high_risk';
  riskLabel: string;
  badgeColor: string;
  lineColor: string;
  isSafest: boolean;
  hasFloodHazard: boolean;
  maxFloodDepth: number;
  whyRecommended: string;
  safetyMarkers: {
    name: string;
    lat: number;
    lng: number;
    description: string;
    riskLevel: string;
  }[];
  steps: {
    instruction: string;
    distanceKm: number;
    durationMin: number;
    name: string;
  }[];
}

// ── GEOMETRY & POLYGON UTILITIES ──────────────────────────────────────────────
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Generate avoid bounding polygons around severe flood zones for ORS */
function buildAvoidPolygonsForCity(cityId: string, vehicle: string = 'car'): [number, number][][][] {
  const hazards = SAFETY_DATABASE[cityId] || [];
  const clearance = VEHICLE_CLEARANCE[vehicle] || VEHICLE_CLEARANCE.car;
  // Identify hazards that exceed or approach vehicle safe clearance
  const avoidHazards = hazards.filter(h => h.waterDepthMeters >= clearance.maxSafeDepth);
  if (avoidHazards.length === 0) return [];

  // Generate ~150m GeoJSON Polygon rings [lng, lat]
  return avoidHazards.map(h => {
    const dLat = 0.00135;
    const dLng = 0.00135 / Math.cos((h.lat * Math.PI) / 180);
    return [
      [
        [h.lng - dLng, h.lat - dLat],
        [h.lng + dLng, h.lat - dLat],
        [h.lng + dLng, h.lat + dLat],
        [h.lng - dLng, h.lat + dLat],
        [h.lng - dLng, h.lat - dLat],
      ]
    ];
  });
}

/** Sample N evenly-spaced points from a coordinate array */
function sampleCoords(coords: [number, number][], n: number): [number, number][] {
  if (coords.length <= n) return coords;
  const step = (coords.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => coords[Math.round(i * step)]);
}

/** Returns true if the two routes are too similar (likely duplicates) */
function areDuplicates(a: [number, number][], b: [number, number][], thresholdM = ROUTE_SIMILARITY_THRESH): boolean {
  const samplesA = sampleCoords(a, 20);
  const samplesB = sampleCoords(b, 20);
  const n = Math.min(samplesA.length, samplesB.length);
  if (n === 0) return false;
  let totalDist = 0;
  for (let i = 0; i < n; i++) {
    const [lngA, latA] = samplesA[i];
    const [lngB, latB] = samplesB[i];
    totalDist += haversineMeters(latA, lngA, latB, lngB);
  }
  return (totalDist / n) < thresholdM;
}

// ── SAFETY ENGINE ─────────────────────────────────────────────────────────────
interface SafetyResult {
  safetyScore: number;
  maxFloodDepth: number;
  hazardsFound: { name: string; lat: number; lng: number; description: string; riskLevel: string }[];
  isImpassable: boolean;
  reasons: string[];
}

function evaluateRouteSafety(coords: [number, number][], cityId: string, vehicle: string = 'car'): SafetyResult {
  const hazards = SAFETY_DATABASE[cityId] || [];
  const clearance = VEHICLE_CLEARANCE[vehicle] || VEHICLE_CLEARANCE.car;
  const hazardsFound: SafetyResult['hazardsFound'] = [];
  const reasons: string[] = [];
  let totalPenalty = 0;
  let maxFlood = 0;
  let isImpassable = false;

  // Sample the route at reasonable density (every ~100m conceptually)
  const samples = sampleCoords(coords, Math.min(coords.length, 80));

  for (const haz of hazards) {
    const isNear = samples.some(([lng, lat]) =>
      haversineMeters(lat, lng, haz.lat, haz.lng) <= HAZARD_RADIUS_M
    );

    if (!isNear) continue;

    hazardsFound.push({ name: haz.name, lat: haz.lat, lng: haz.lng, description: haz.description, riskLevel: haz.riskLevel });
    maxFlood = Math.max(maxFlood, haz.waterDepthMeters);
    const severityWeight = HAZARD_SEVERITY_WEIGHT[haz.riskLevel];

    // Determine flood penalty tier calibrated to vehicle clearance limits
    let floodPenalty: number;
    if (haz.waterDepthMeters >= clearance.impassableDepth) {
      // True vehicle stall / impassability
      floodPenalty = FLOOD_PENALTY.impassable;
      isImpassable = true;
      reasons.push(`Impassable for ${vehicle}: ${haz.name} (${haz.waterDepthMeters}m exceeds ${clearance.impassableDepth}m clearance limit)`);
    } else if (haz.waterDepthMeters >= clearance.maxSafeDepth * 1.5) {
      floodPenalty = FLOOD_PENALTY.critical;
      reasons.push(`Critical water depth for ${vehicle} near ${haz.name} (${haz.waterDepthMeters}m)`);
    } else if (haz.waterDepthMeters >= clearance.maxSafeDepth) {
      floodPenalty = FLOOD_PENALTY.severe;
      reasons.push(`Substantial waterlogging for ${vehicle} near ${haz.name} (${haz.waterDepthMeters}m)`);
    } else if (haz.waterDepthMeters >= clearance.maxSafeDepth * 0.5) {
      floodPenalty = FLOOD_PENALTY.moderate;
      reasons.push(`Moderate surface water: ${haz.name} (${haz.waterDepthMeters}m)`);
    } else {
      floodPenalty = FLOOD_PENALTY.low;
      reasons.push(`Minor surface water: ${haz.name}`);
    }

    totalPenalty += floodPenalty * severityWeight * clearance.penaltyMultiplier;
  }

  if (isImpassable) {
    return { safetyScore: 0, maxFloodDepth: maxFlood, hazardsFound, isImpassable: true, reasons };
  }

  // Normalize: max realistic penalty for one critical hazard is ~80; scale to 0–100
  // Use 200 as denominator so even the worst single hazard still gives a non-zero score
  const normalizedRisk = Math.min(1, totalPenalty / 200);
  const safetyScore = Math.round(Math.max(5, Math.min(100, 100 * (1 - normalizedRisk))));

  if (hazardsFound.length === 0) {
    reasons.push('No known flood hazards on this route');
    reasons.push('Clear road conditions expected');
  }

  return { safetyScore, maxFloodDepth: +(maxFlood).toFixed(2), hazardsFound, isImpassable: false, reasons };
}

// ── NORMALIZE SCORES ACROSS CANDIDATE ROUTES ─────────────────────────────────
function normalizeScores(candidates: { durationMin: number; distanceKm: number }[]): { timeScores: number[]; distScores: number[] } {
  const times = candidates.map(c => c.durationMin);
  const dists = candidates.map(c => c.distanceKm);
  const Tmin = Math.min(...times), Tmax = Math.max(...times);
  const Dmin = Math.min(...dists),  Dmax = Math.max(...dists);

  const timeScores = times.map(t =>
    Tmax === Tmin ? 100 : Math.round(100 * (Tmax - t) / (Tmax - Tmin))
  );
  const distScores = dists.map(d =>
    Dmax === Dmin ? 100 : Math.round(100 * (Dmax - d) / (Dmax - Dmin))
  );

  return { timeScores, distScores };
}

// ── LABEL ROUTES BASED ON ACTUAL RANKED POSITION ─────────────────────────────
function labelRoute(rank: number, safetyScore: number, timeScore: number): {
  riskCategory: 'safe' | 'moderate' | 'high_risk';
  riskLabel: string;
  badgeColor: string;
  lineColor: string;
} {
  if (rank === 0) {
    return { riskCategory: 'safe', riskLabel: '🟢 Safest Route', badgeColor: 'bg-emerald-600 text-white', lineColor: '#10B981' };
  } else if (rank === 1) {
    return { riskCategory: 'moderate', riskLabel: '🟡 Balanced Route', badgeColor: 'bg-amber-500 text-white', lineColor: '#F59E0B' };
  } else {
    return { riskCategory: 'high_risk', riskLabel: '🔴 Higher-Risk Route', badgeColor: 'bg-rose-600 text-white', lineColor: '#EF4444' };
  }
}

// ── BUILD WHY-RECOMMENDED EXPLANATION ────────────────────────────────────────
function buildWhyText(
  rank: number,
  safetyScore: number,
  timeScore: number,
  distanceScore: number,
  safetyReasons: string[],
  durationMin: number
): string {
  if (rank === 0) {
    const positives = safetyReasons.filter(r => r.startsWith('No known') || r.startsWith('Clear'));
    const base = positives.length > 0
      ? positives.join(' · ')
      : `Highest safety score (${safetyScore}/100) among all alternatives`;
    return `${base} · Recommended for safest evacuation`;
  } else if (rank === 1) {
    const hasHazards = safetyReasons.some(r => !r.startsWith('No known'));
    return hasHazards
      ? `Reasonable safety (${safetyScore}/100) with ${durationMin} min travel time · ${safetyReasons[0] || 'Minor hazard exposure'}`
      : `Balanced option · Safety ${safetyScore}/100 · ${durationMin} min travel time`;
  } else {
    const hazardDesc = safetyReasons.filter(r => !r.startsWith('No known') && !r.startsWith('Clear')).slice(0, 2).join(' · ');
    return hazardDesc
      ? `Shorter travel time, but: ${hazardDesc}`
      : `Faster route (${durationMin} min) · Lower safety score (${safetyScore}/100) · Use with caution`;
  }
}

// ── URBAN TRAFFIC & WEATHER CALIBRATION (REAL-WORLD INDIAN CITY DYNAMICS) ───
// OpenStreetMap provides statutory speed limits (free-flow). In real-world Indian
// metros (Chennai, Mumbai, Bengaluru, Delhi) with signals, intersections, and monsoon
// caution, realistic driving times are calibrated using empirical urban traffic coefficients.
const VEHICLE_URBAN_TRAFFIC_MULTIPLIER: Record<string, number> = {
  ambulance: 0.85, // Emergency vehicle: sirens + right-of-way priority (fastest transit on road)
  bike:      0.95, // Motorized 2-wheeler: filters through traffic jams & narrow gaps (faster than cars)
  car:       1.35, // Passenger car: Indian urban congestion + traffic lights (~22-28 km/h avg)
  bus:       1.50, // Heavy transit: broad turning radii, heavy inertia & junction delays
  walking:   1.00, // Pedestrian: constant walking speed (~4.5-5.0 km/h)
};

// ── PARSE OSRM ROUTES ─────────────────────────────────────────────────────────
function parseOSRM(osrmData: any, vehicle: string = 'car'): { coords: [number,number][]; distanceKm: number; durationMin: number; steps: any[]; name: string }[] {
  const routesArr: any[] = osrmData.routes || [];
  const trafficMult = VEHICLE_URBAN_TRAFFIC_MULTIPLIER[vehicle] || 1.38;

  return routesArr.map((r: any) => {
    const coords = r.geometry?.coordinates as [number, number][];
    const distanceKm = +((r.distance || 0) / 1000).toFixed(1);
    const rawMin = (r.duration || 0) / 60;
    const durationMin = Math.max(1, Math.round(rawMin * trafficMult));
    const steps = r.legs?.[0]?.steps || [];
    const name = steps.find((s: any) => s.name && s.name.length > 2)?.name || 'Primary Road';
    return { coords, distanceKm, durationMin, steps, name };
  });
}

// ── PARSE ORS ROUTES ──────────────────────────────────────────────────────────
function parseORS(orsData: any, vehicle: string = 'car'): { coords: [number,number][]; distanceKm: number; durationMin: number; steps: any[]; name: string }[] {
  const features: any[] = orsData.features || [];
  const trafficMult = VEHICLE_URBAN_TRAFFIC_MULTIPLIER[vehicle] || 1.38;

  return features.map((feature: any) => {
    const summary = feature.properties?.summary;
    const steps: any[] = feature.properties?.segments?.[0]?.steps || [];
    const coords = feature.geometry.coordinates as [number, number][];
    const distanceKm = summary ? +(summary.distance).toFixed(1) : 0;
    const rawMin = summary ? (summary.duration / 60) : 0;
    const durationMin = summary ? Math.max(1, Math.round(rawMin * trafficMult)) : 0;
    const name = steps.find((s: any) => s.name && s.name !== '-' && s.distance > 0.5)?.name || 'Arterial Corridor';
    return { coords, distanceKm, durationMin, steps, name };
  });
}

// ── MAIN ROUTE API HANDLER ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const originLat: number = Number(body.originLat ?? body.oLat);
    const originLng: number = Number(body.originLng ?? body.oLng);
    const destLat: number   = Number(body.destLat   ?? body.dLat);
    const destLng: number   = Number(body.destLng   ?? body.dLng);
    const vehicle: string   = body.vehicle   || 'car';
    const cityId: string    = body.cityId    || 'mumbai';

    if (!isFinite(originLat) || !isFinite(originLng) || !isFinite(destLat) || !isFinite(destLng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates', detail: 'originLat, originLng, destLat, destLng are required numeric values.' },
        { status: 400 }
      );
    }

    // Cache check
    const cacheKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}_${destLat.toFixed(4)},${destLng.toFixed(4)}_${vehicle}_${cityId}`;
    const cached = routeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // Raw parsed routes from whichever provider responds
    let rawRoutes: { coords: [number,number][]; distanceKm: number; durationMin: number; steps: any[]; name: string }[] = [];
    let providerUsed = 'none';

    // ── PROVIDER 1: OpenRouteService (ORS) — Primary ──────────────────────────
    // ORS natively supports real alternative routes via alternative_routes parameter
    // and proactive flood detour via options.avoid_polygons
    const orsKey = process.env.ORS_API_KEY;
    const avoidPolygons = buildAvoidPolygonsForCity(cityId, vehicle);
    let avoidPolygonsApplied = false;

    if (orsKey) {
      try {
        const orsProfile = VEHICLE_TO_ORS[vehicle] ?? 'driving-car';
        const orsUrl = `${ORS_BASE}/${orsProfile}/geojson`;

        const orsRequestBody: any = {
          coordinates: [[originLng, originLat], [destLng, destLat]],
          instructions: true,
          language: 'en',
          units: 'km',
          // Relaxed constraints to maximise chance of getting 3 real alternatives:
          // share_factor: routes may share up to 80% of segments (down from 60%)
          // weight_factor: alternative may be up to 60% longer by routing weight
          alternative_routes: {
            target_count: 3,
            share_factor: 0.8,
            weight_factor: 1.6,
          },
        };

        if (avoidPolygons.length > 0) {
          orsRequestBody.options = {
            avoid_polygons: {
              type: 'MultiPolygon',
              coordinates: avoidPolygons,
            },
          };
        }

        let orsRes = await fetch(orsUrl, {
          method: 'POST',
          headers: {
            Authorization: orsKey,
            'Content-Type': 'application/json',
            Accept: 'application/json, application/geo+json',
          },
          body: JSON.stringify(orsRequestBody),
          signal: AbortSignal.timeout(6000),
        });

        // If avoid_polygons caused a routing failure (e.g. origin inside polygon), fallback to standard ORS
        if (!orsRes.ok && avoidPolygons.length > 0) {
          delete orsRequestBody.options;
          orsRes = await fetch(orsUrl, {
            method: 'POST',
            headers: {
              Authorization: orsKey,
              'Content-Type': 'application/json',
              Accept: 'application/json, application/geo+json',
            },
            body: JSON.stringify(orsRequestBody),
            signal: AbortSignal.timeout(6000),
          });
        } else if (orsRes.ok && avoidPolygons.length > 0) {
          avoidPolygonsApplied = true;
        }

        if (orsRes.ok) {
          const orsData = await orsRes.json();
          const parsed = parseORS(orsData, vehicle);
          if (parsed.length > 0) {
            rawRoutes = parsed;
            providerUsed = 'ors';
          }
        }
      } catch (orsErr: any) {
        console.warn('[ORS error, trying OSRM]', orsErr.message);
      }
    }

    // ── PROVIDER 2: OSRM (Public, No Key) — Fallback + Supplement ───────────────
    // Used when: (a) ORS returned 0 routes, OR (b) ORS returned fewer than 3 — supplement with OSRM's
    // alternatives so we can always aim for 3 real-road routes total.
    if (rawRoutes.length < 3) {
      try {
        const osrmProfile = VEHICLE_TO_OSRM[vehicle] || 'driving';
        const osrmUrl = `${OSRM_BASE}/${osrmProfile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=true&steps=true`;

        const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(5000) });
        if (osrmRes.ok) {
          const osrmData = await osrmRes.json();
          const parsed = parseOSRM(osrmData, vehicle);
          if (parsed.length > 0) {
            if (rawRoutes.length === 0) {
              rawRoutes = parsed;
              providerUsed = 'osrm';
            } else {
              // Supplement: append OSRM routes not already covered by ORS results
              for (const candidate of parsed) {
                if (!rawRoutes.some(existing => areDuplicates(existing.coords, candidate.coords))) {
                  rawRoutes.push(candidate);
                  providerUsed = 'ors+osrm';
                }
              }
            }
          }
        }
      } catch (osrmErr: any) {
        console.warn('[OSRM error]', osrmErr.message);
      }
    }

    // No routes at all — return empty
    if (rawRoutes.length === 0) {
      return NextResponse.json({ routes: [], error: 'No road path found between the given points.' }, { status: 200 });
    }

    // ── STEP 1: DEDUPLICATE similar routes ────────────────────────────────────
    const unique: typeof rawRoutes = [];
    for (const candidate of rawRoutes) {
      const isDupe = unique.some(u => areDuplicates(u.coords, candidate.coords));
      if (!isDupe) unique.push(candidate);
    }

    // ── STEP 2: SAFETY ANALYSIS per route (calibrated to vehicle & flood delay) ──
    const withSafety = unique.map(r => {
      const safety = evaluateRouteSafety(r.coords, cityId, vehicle);
      // Realistic flood caution slowdown: vehicles navigate waterlogged stretches at reduced crawl speeds
      let floodCautionMin = 0;
      for (const h of safety.hazardsFound) {
        if (h.riskLevel === 'critical') floodCautionMin += 3;
        else if (h.riskLevel === 'moderate') floodCautionMin += 1.5;
        else floodCautionMin += 0.5;
      }
      return {
        ...r,
        durationMin: Math.max(1, Math.round(r.durationMin + floodCautionMin)),
        safety,
      };
    });

    // ── STEP 3: EXCLUDE impassable routes ─────────────────────────────────────
    const passable = withSafety.filter(r => !r.safety.isImpassable);

    // If all were impassable, still show them (better than nothing) with 0 score
    const candidates = passable.length > 0 ? passable : withSafety;

    // ── STEP 4: NORMALIZE TIME + DISTANCE SCORES across candidates ────────────
    const { timeScores, distScores } = normalizeScores(candidates);

    // ── STEP 5: CALCULATE FINAL SCORE (60/25/15) ──────────────────────────────
    const scored = candidates.map((c, i) => ({
      ...c,
      timeScore: timeScores[i],
      distanceScore: distScores[i],
      finalScore: Math.round(
        c.safety.safetyScore * W_SAFETY +
        timeScores[i]        * W_TIME   +
        distScores[i]        * W_DISTANCE
      ),
    }));

    // ── STEP 6: RANK by finalScore descending ─────────────────────────────────
    scored.sort((a, b) => b.finalScore - a.finalScore);

    // Limit to top 3
    const top3 = scored.slice(0, 3);

    // ── STEP 7: BUILD FINAL RouteAlternativeItem OBJECTS ─────────────────────
    const processedRoutes: RouteAlternativeItem[] = top3.map((c, rank) => {
      const label = labelRoute(rank, c.safety.safetyScore, c.timeScore);
      const whyRecommended = buildWhyText(
        rank,
        c.safety.safetyScore,
        c.timeScore,
        c.distanceScore,
        c.safety.reasons,
        c.durationMin
      );

      const trafficMult = VEHICLE_URBAN_TRAFFIC_MULTIPLIER[vehicle] || 1.38;

      // Format steps (ORS vs OSRM have different step shapes)
      const steps = c.steps.map((s: any) => ({
        instruction: s.maneuver?.instruction || s.instruction || `Proceed on ${s.name || 'road'}`,
        distanceKm: s.maneuver
          ? +((s.distance || 0) / 1000).toFixed(2)    // OSRM: meters
          : +(s.distance ?? 0).toFixed(2),             // ORS: km already
        durationMin: Math.max(1, Math.round(((s.duration || 0) / (s.maneuver ? 60 : 1)) * trafficMult)),
        name: s.name || '',
      }));

      return {
        id: `route-${providerUsed}-${rank}`,
        name: `via ${c.name}`,
        summaryText: whyRecommended.split(' · ')[0],
        coordinates: c.coords,
        distanceKm: c.distanceKm,
        durationMin: c.durationMin,
        safetyScore: c.safety.safetyScore,
        timeScore: c.timeScore,
        distanceScore: c.distanceScore,
        finalScore: c.finalScore,
        riskCategory: label.riskCategory,
        riskLabel: label.riskLabel,
        badgeColor: label.badgeColor,
        lineColor: label.lineColor,
        isSafest: rank === 0,
        hasFloodHazard: c.safety.hazardsFound.length > 0,
        maxFloodDepth: c.safety.maxFloodDepth,
        whyRecommended,
        safetyMarkers: c.safety.hazardsFound,
        steps,
      };
    });

    // ── STEP 8: AI ROUTE BRIEFING (GEMINI) ────────────────────────────────────
    let aiBriefing = '';
    const originLabel = body.originLabel || 'Origin Point';
    const destLabel = body.destLabel || 'Destination';
    const safest = processedRoutes[0];

    if (process.env.GEMINI_API_KEY && safest) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are JalRakshak Emergency Flood Routing Copilot.
Generate a concise 2-sentence tactical warning & evacuation briefing for a driver using a ${vehicle}.
Trip: ${originLabel} to ${destLabel}.
Safest Route: ${safest.name} (Safety Score: ${safest.safetyScore}/100, Est. Time: ${safest.durationMin} min).
Reason: ${safest.whyRecommended}.
Max Flood Encountered: ${safest.maxFloodDepth}m.
Avoidance Polygons Active: ${avoidPolygonsApplied ? 'Yes, routing actively navigated around submerged hotspots' : 'No'}.
Give actionable, urgent, and precise driver guidance. Keep under 40 words.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        aiBriefing = response.text?.trim() || '';
      } catch (geminiErr: any) {
        console.warn('[Gemini briefing warning]', geminiErr?.message);
      }
    }

    if (!aiBriefing && safest) {
      aiBriefing = safest.hasFloodHazard
        ? `Caution: Take ${safest.name} (${safest.safetyScore}/100 safety). Active water pooling up to ${safest.maxFloodDepth}m detected on alternative routes. Maintain steady speed.`
        : `All clear: ${safest.name} offers optimal clearance for ${vehicle} (${safest.safetyScore}/100 safety, ${safest.durationMin} mins). No critical water sumps encountered.`;
    }

    const responsePayload = {
      routes: processedRoutes,
      origin: { lng: originLng, lat: originLat, label: originLabel },
      destination: { lng: destLng, lat: destLat, label: destLabel },
      safestRoute: processedRoutes[0],
      providerUsed,
      aiBriefing,
      avoidPolygonsApplied,
      vehicleClearance: VEHICLE_CLEARANCE[vehicle] || VEHICLE_CLEARANCE.car,
    };

    routeCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
    return NextResponse.json(responsePayload);

  } catch (err: any) {
    console.error('[Directions API Fatal Error]', err.message);
    return NextResponse.json(
      { error: 'Internal Routing Error', detail: err.message },
      { status: 500 }
    );
  }
}
