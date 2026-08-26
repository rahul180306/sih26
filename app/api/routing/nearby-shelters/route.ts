import { NextRequest, NextResponse } from 'next/server';
import { CITY_EMERGENCY_HUBS } from '@/lib/routing/engine';

interface EmergencyHubResult {
  id: string;
  name: string;
  category: 'hospital' | 'shelter' | 'transit' | 'subway' | 'commercial' | 'hotspot' | string;
  cityId?: string;
  lat: number;
  lng: number;
  address: string;
  distanceKm: number;
}

function haversineDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: 'Missing lat or lng query parameters' }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const discoveredHubs: EmergencyHubResult[] = [];
  const apiKey = process.env.ORS_API_KEY;

  // ── PROVIDER 1: Multi-Query OpenStreetMap Nominatim POI Search (Global & Highly Accurate) ──
  try {
    const bboxDelta = 0.35; // ~35km bounding box
    const queries = ['hospital', 'emergency shelter', 'relief camp', 'medical centre'];
    
    // Execute Nominatim search for real local hospitals & relief shelters
    const nominatimPromises = queries.slice(0, 2).map(q => 
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&viewbox=${lng - bboxDelta},${lat + bboxDelta},${lng + bboxDelta},${lat - bboxDelta}&bounded=1`, {
        headers: { 'User-Agent': 'JalRakshak-Universal-Emergency-Router/3.0' },
        signal: AbortSignal.timeout(3500),
      }).then(r => r.ok ? r.json() : []).catch(() => [])
    );

    const nominatimResults = (await Promise.all(nominatimPromises)).flat();
    if (Array.isArray(nominatimResults)) {
      for (const item of nominatimResults) {
        const hLat = parseFloat(item.lat);
        const hLng = parseFloat(item.lon);
        if (!isNaN(hLat) && !isNaN(hLng)) {
          const dist = haversineDistKm(lat, lng, hLat, hLng);
          const rawName = (item.display_name || item.name || 'Emergency Medical Center').split(',')[0].trim();
          const isShelter = (item.type || '').includes('shelter') || (item.class || '').includes('shelter') || rawName.toLowerCase().includes('camp') || rawName.toLowerCase().includes('shelter');
          discoveredHubs.push({
            id: `osm-${item.place_id || `${hLat.toFixed(4)}_${hLng.toFixed(4)}`}`,
            name: rawName,
            category: isShelter ? 'shelter' : 'hospital',
            lat: hLat,
            lng: hLng,
            address: item.display_name || 'Nearby Emergency Facility',
            distanceKm: Math.round(dist * 10) / 10,
          });
        }
      }
    }
  } catch (err: any) {
    console.warn('[Nearby Shelters] Global Nominatim search notice:', err.message);
  }

  // ── PROVIDER 2: OpenRouteService Geocode POI Search ──────────────────────────
  if (apiKey && discoveredHubs.length < 3) {
    try {
      const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=hospital&focus.point.lat=${lat}&focus.point.lon=${lng}&boundary.circle.lat=${lat}&boundary.circle.lon=${lng}&boundary.circle.radius=40&size=10`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json();
        const features = data.features || [];
        for (const f of features) {
          const hLng = f.geometry?.coordinates?.[0];
          const hLat = f.geometry?.coordinates?.[1];
          if (hLat && hLng) {
            const dist = haversineDistKm(lat, lng, hLat, hLng);
            const rawName = f.properties?.name || f.properties?.label?.split(',')?.[0] || 'Hospital / Emergency Hub';
            const address = f.properties?.label || f.properties?.street || 'Local Medical Center';
            discoveredHubs.push({
              id: `live-poi-${hLat.toFixed(4)}_${hLng.toFixed(4)}`,
              name: rawName,
              category: 'hospital',
              lat: hLat,
              lng: hLng,
              address,
              distanceKm: Math.round(dist * 10) / 10,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('[Nearby Shelters] ORS search notice:', err.message);
    }
  }

  // ── PROVIDER 3: Curated Emergency Database Across All Known Cities ──────────
  const curatedHubs = Object.values(CITY_EMERGENCY_HUBS).flat().map(h => ({
    ...h,
    distanceKm: Math.round(haversineDistKm(lat, lng, h.lat, h.lng) * 10) / 10,
  }));

  const allCandidates = [...discoveredHubs, ...curatedHubs];
  allCandidates.sort((a, b) => a.distanceKm - b.distanceKm);

  // Deduplicate by proximity (< 300m) and clean name
  const uniqueHubs: EmergencyHubResult[] = [];
  for (const c of allCandidates) {
    if (!uniqueHubs.some(u => haversineDistKm(u.lat, u.lng, c.lat, c.lng) < 0.3 || u.name.toLowerCase() === c.name.toLowerCase())) {
      uniqueHubs.push(c);
    }
    if (uniqueHubs.length >= 10) break;
  }

  const closest = uniqueHubs[0] || null;

  return NextResponse.json({
    shelters: uniqueHubs,
    closest,
    searchOrigin: { lat, lng },
  });
}
