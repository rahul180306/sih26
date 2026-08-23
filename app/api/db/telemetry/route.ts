import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/neon';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || 'mumbai';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const sql = getDb();

    const rainfallLogs = await sql`
      SELECT id, provider, city, average_intensity_mm_hr, peak_intensity_mm_hr, spatial_resolution, quality, snapshot_hash, observed_at, ingested_at
      FROM rainfall_snapshots
      WHERE LOWER(city) = LOWER(${city})
      ORDER BY observed_at DESC
      LIMIT ${limit}
    `;

    const floodLogs = await sql`
      SELECT id, city, hotspot_name, water_level_m, drainage_capacity_pct, risk_level, lat, lng, evacuation_priority, logged_at
      FROM flood_inundation_logs
      WHERE LOWER(city) = LOWER(${city})
      ORDER BY logged_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({
      status: 'success',
      city,
      rainfallLogs,
      floodLogs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Failed to query telemetry' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sql = getDb();

    if (body.type === 'rainfall_snapshot') {
      const { provider, city, averageIntensity, peakIntensity, accumulated6hr, spatialResolution, quality, snapshotHash, sourceIdentifier, rawGrid, observedAt } = body;

      const inserted = await sql`
        INSERT INTO rainfall_snapshots (
          provider, city, average_intensity_mm_hr, peak_intensity_mm_hr, accumulated_6hr_mm,
          spatial_resolution, quality, snapshot_hash, source_identifier, raw_grid, observed_at
        ) VALUES (
          ${provider || 'UNKNOWN'},
          ${city || 'mumbai'},
          ${averageIntensity || 0},
          ${peakIntensity || 0},
          ${accumulated6hr || 0},
          ${spatialResolution || '1km'},
          ${quality || 'LIVE'},
          ${snapshotHash || 'hash'},
          ${sourceIdentifier || 'unknown'},
          ${JSON.stringify(rawGrid || [])}::jsonb,
          ${observedAt || new Date().toISOString()}
        ) RETURNING id, snapshot_hash, created_at;
      `;

      return NextResponse.json({ status: 'success', inserted: inserted[0] });
    }

    if (body.type === 'flood_log') {
      const { city, hotspotName, waterLevel, drainageCapacity, riskLevel, lat, lng, evacuationPriority } = body;

      const inserted = await sql`
        INSERT INTO flood_inundation_logs (
          city, hotspot_name, water_level_m, drainage_capacity_pct, risk_level, lat, lng, evacuation_priority
        ) VALUES (
          ${city || 'mumbai'},
          ${hotspotName || 'Hotspot'},
          ${waterLevel || 0},
          ${drainageCapacity || 0},
          ${riskLevel || 'LOW'},
          ${lat || 0},
          ${lng || 0},
          ${evacuationPriority || 'P3'}
        ) RETURNING id, hotspot_name, logged_at;
      `;

      return NextResponse.json({ status: 'success', inserted: inserted[0] });
    }

    return NextResponse.json({ status: 'error', message: 'Unknown telemetry type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Failed to record telemetry' },
      { status: 500 }
    );
  }
}
