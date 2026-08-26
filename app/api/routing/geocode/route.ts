import { NextRequest, NextResponse } from 'next/server';

const ORS_GEOCODE_URL = 'https://api.openrouteservice.org/geocode/search';

export async function GET(req: NextRequest) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ORS_API_KEY missing' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text');
  if (!text || text.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = `${ORS_GEOCODE_URL}?api_key=${apiKey}&text=${encodeURIComponent(text)}&boundary.country=IND&size=6`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    const results = (data.features || []).map((f: any) => ({
      id: f.properties.id || `${f.geometry.coordinates[0]}_${f.geometry.coordinates[1]}`,
      name: f.properties.name || f.properties.label.split(',')[0],
      label: f.properties.label,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      locality: f.properties.locality || f.properties.region || '',
    }));

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('[ORS Geocode] Error:', err.message);
    return NextResponse.json({ results: [] });
  }
}
