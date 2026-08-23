import { NextRequest, NextResponse } from 'next/server';
import { initDatabaseSchema } from '@/lib/db/neon';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    const res = await initDatabaseSchema();
    return NextResponse.json({
      status: 'success',
      ...res,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error?.message || 'Database schema migration failed',
      },
      { status: 500 }
    );
  }
}
