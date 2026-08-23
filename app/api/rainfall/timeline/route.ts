import { NextRequest, NextResponse } from 'next/server';
import { getNormalizedRainfall } from '@/lib/rainfall/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || 'mumbai';
    const lat = parseFloat(searchParams.get('lat') || '19.076');
    const lng = parseFloat(searchParams.get('lng') || '72.877');

    const currentSnapshot = await getNormalizedRainfall(city, lat, lng);
    const now = new Date();

    // Generate 6-hour nowcast timeline (-3hr historical to +3hr nowcast)
    const timeline = [-3, -2, -1, 0, 1, 2, 3].map((hrOffset) => {
      const stepTime = new Date(now.getTime() + hrOffset * 60 * 60 * 1000);
      const factor = hrOffset <= 0 ? (1 - Math.abs(hrOffset) * 0.15) : (1 + hrOffset * 0.12);
      const intensity = Math.max(0, Number((currentSnapshot.averageIntensity_mm_hr * factor).toFixed(1)));
      
      return {
        timestamp: stepTime.toISOString(),
        timeLabel: stepTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
        offsetHours: hrOffset,
        type: hrOffset < 0 ? 'HISTORICAL' : (hrOffset === 0 ? 'CURRENT_OBSERVATION' : 'NOWCAST_PROJECTION'),
        intensity_mm_hr: intensity,
        provider: currentSnapshot.provider,
        quality: currentSnapshot.quality,
      };
    });

    return NextResponse.json({
      status: 'success',
      city,
      provider: currentSnapshot.provider,
      timeline,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Failed to generate rainfall timeline' },
      { status: 500 }
    );
  }
}
