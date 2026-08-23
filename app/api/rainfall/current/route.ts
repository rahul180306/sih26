import { NextRequest, NextResponse } from 'next/server';
import { getNormalizedRainfall } from '@/lib/rainfall/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || 'mumbai';
    const lat = parseFloat(searchParams.get('lat') || '19.076');
    const lng = parseFloat(searchParams.get('lng') || '72.877');

    const snapshot = await getNormalizedRainfall(city, lat, lng);

    return NextResponse.json({
      status: 'success',
      data: snapshot,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Failed to fetch current rainfall' },
      { status: 500 }
    );
  }
}
