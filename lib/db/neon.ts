import { neon, Pool } from '@neondatabase/serverless';

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
}

// Reusable SQL tagged template query runner for serverless queries
export function getDb() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error('DATABASE_URL or NEON_DATABASE_URL environment variable is not configured.');
  }
  return neon(connectionString);
}

// Connection pool instance for transactional or batch workloads
let poolInstance: Pool | null = null;

export function getDbPool(): Pool {
  if (!poolInstance) {
    const connectionString = getDatabaseUrl();
    if (!connectionString) {
      throw new Error('DATABASE_URL or NEON_DATABASE_URL environment variable is not configured.');
    }
    poolInstance = new Pool({
      connectionString,
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

  await sql`
    CREATE TABLE IF NOT EXISTS flood_alerts (
      id VARCHAR(64) PRIMARY KEY,
      cap_identifier VARCHAR(128) NOT NULL,
      city_id VARCHAR(64) NOT NULL,
      city_name VARCHAR(128) NOT NULL,
      catchment_id VARCHAR(64),
      hotspot_name VARCHAR(128) NOT NULL,
      severity VARCHAR(32) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
      urgency VARCHAR(32) DEFAULT 'Immediate',
      certainty VARCHAR(32) DEFAULT 'Observed',
      headline TEXT NOT NULL,
      description TEXT NOT NULL,
      instruction TEXT NOT NULL,
      predicted_depth_m NUMERIC(5, 2) NOT NULL,
      drainage_surcharge_pct NUMERIC(5, 2) NOT NULL,
      lead_time_hours NUMERIC(4, 2) NOT NULL,
      rainfall_intensity_mm_hr NUMERIC(6, 2) NOT NULL,
      affected_roads JSONB,
      vulnerable_population_est INTEGER,
      lat NUMERIC(9, 6) NOT NULL,
      lng NUMERIC(9, 6) NOT NULL,
      source VARCHAR(128),
      issued_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS alert_broadcast_logs (
      id SERIAL PRIMARY KEY,
      alert_id VARCHAR(64) NOT NULL,
      channel VARCHAR(32) NOT NULL,
      recipient_count INTEGER NOT NULL,
      status VARCHAR(32) DEFAULT 'DELIVERED',
      dispatched_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // Indexes for high-frequency queries
  await sql`CREATE INDEX IF NOT EXISTS idx_rainfall_snapshots_city ON rainfall_snapshots (city, observed_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_flood_logs_city ON flood_inundation_logs (city, logged_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_flood_alerts_city ON flood_alerts (city_id, issued_at DESC);`;

  return { success: true, message: 'Neon Postgres schema verified and initialized' };
}

