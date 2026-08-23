import { NextRequest, NextResponse } from 'next/server';
import { getAllProvidersStatus } from '@/lib/rainfall/engine';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const providers = getAllProvidersStatus();
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      activeProfile: process.env.RAINFALL_SOURCE_PROFILE || 'development',
      providers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Failed to fetch provider status' },
      { status: 500 }
    );
  }
}
