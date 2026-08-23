import { neon, Pool } from '@neondatabase/serverless';

const DEFAULT_NEON_URL =
  'postgresql://neondb_owner:npg_ueX7iTE2Qjpo@ep-royal-silence-b34de2v0-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || DEFAULT_NEON_URL;
}

// Reusable SQL tagged template query runner for serverless queries
export function getDb() {
  const connectionString = getDatabaseUrl();
  return neon(connectionString);
}

// Connection pool instance for transactional or batch workloads
let poolInstance: Pool | null = null;

export function getDbPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }
  return poolInstance;
}

// Database schema migration / bootstrap runner
export async function initDatabaseSchema() {
  const sql = getDb();

  // Create tables for JalRakshak hydraulic, rainfall, routing & alert telemetry
  await sql`
    CREATE TABLE IF NOT EXISTS rainfall_snapshots (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(64) NOT NULL,
      city VARCHAR(64) NOT NULL,
      average_intensity_mm_hr NUMERIC(6, 2) NOT NULL,
      peak_intensity_mm_hr NUMERIC(6, 2) NOT NULL,
      accumulated_6hr_mm NUMERIC(6, 2),
      spatial_resolution VARCHAR(64),
      quality VARCHAR(32) NOT NULL,
      snapshot_hash VARCHAR(64) NOT NULL,
      source_identifier TEXT,
      raw_grid JSONB,
      observed_at TIMESTAMPTZ NOT NULL,
      ingested_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS flood_inundation_logs (
      id SERIAL PRIMARY KEY,
      city VARCHAR(64) NOT NULL,
      hotspot_name VARCHAR(128) NOT NULL,
      water_level_m NUMERIC(5, 2) NOT NULL,
      drainage_capacity_pct NUMERIC(5, 2) NOT NULL,
      risk_level VARCHAR(32) NOT NULL,
      lat NUMERIC(9, 6) NOT NULL,
      lng NUMERIC(9, 6) NOT NULL,
      evacuation_priority VARCHAR(32),
      logged_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS safe_routes_history (
      id SERIAL PRIMARY KEY,
      city VARCHAR(64) NOT NULL,
      origin_name VARCHAR(128) NOT NULL,
      destination_name VARCHAR(128) NOT NULL,
      distance_km NUMERIC(6, 2),
      estimated_time_min INTEGER,
      safety_score NUMERIC(5, 2),
      waypoints JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ndrf_action_logs (
      id SERIAL PRIMARY KEY,
      city VARCHAR(64) NOT NULL,
      incident_type VARCHAR(64) NOT NULL,
      location VARCHAR(128) NOT NULL,
      severity VARCHAR(32) NOT NULL,
      status VARCHAR(32) DEFAULT 'DISPATCHED',
      officer_assigned VARCHAR(128),
      coordinates JSONB,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // Indexes for high-frequency queries
  await sql`CREATE INDEX IF NOT EXISTS idx_rainfall_snapshots_city ON rainfall_snapshots (city, observed_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_flood_logs_city ON flood_inundation_logs (city, logged_at DESC);`;

  return { success: true, message: 'Neon Postgres schema verified and initialized' };
}
