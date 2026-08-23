import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabaseSchema } from '@/lib/db/neon';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const sql = getDb();
    
    // Execute quick connectivity check query
    const result = await sql`
      SELECT 
        NOW() as current_time, 
        version() as pg_version,
        current_database() as database_name,
        current_user as current_user
    `;

    // Initialize tables if not already created
    try {
      await initDatabaseSchema();
    } catch {
      // Table creation logged
    }

    // Check table row counts
    const tablesCount = await sql`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
    `;

    return NextResponse.json({
      status: 'connected',
      provider: 'Neon Serverless PostgreSQL',
      serverTime: result[0]?.current_time,
      database: result[0]?.database_name,
      user: result[0]?.current_user,
      postgresVersion: result[0]?.pg_version,
      publicTablesCount: Number(tablesCount[0]?.table_count || 0),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        provider: 'Neon Serverless PostgreSQL',
        message: error?.message || 'Failed to connect to Neon PostgreSQL database',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
