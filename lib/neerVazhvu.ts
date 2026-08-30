export type NeerVazhvuLayerKey = 'drainage' | 'sewer' | 'river' | 'flood' | 'reservoir';

export const NEER_VAZHVU_CITY_LAYERS: Record<string, Record<NeerVazhvuLayerKey, string>> = {
  chennai: {
    drainage: '/data/neer-vazhvu/chennai/chennai-drainage.geojson',
    sewer: '/data/neer-vazhvu/chennai/chennai-sewerage.geojson',
    river: '/data/neer-vazhvu/chennai/chennai-rivers.geojson',
    flood: '/data/neer-vazhvu/chennai/chennai-flood-hazard-zones.geojson',
    reservoir: '/data/neer-vazhvu/chennai/reservoir-catchments.geojson',
  },
  bengaluru: {
    drainage: '/data/neer-vazhvu/bengaluru/bangalore-swd-primary.geojson',
    sewer: '/data/neer-vazhvu/bengaluru/bangalore-sewerage-trunks.geojson',
    river: '/data/neer-vazhvu/bengaluru/bangalore-rivers.geojson',
    flood: '/data/neer-vazhvu/bengaluru/bangalore-flood-hotspots.geojson',
    reservoir: '/data/neer-vazhvu/bengaluru/reservoirs.geojson',
  },
  mumbai: {
    drainage: '/data/neer-vazhvu/mumbai/mumbai-drainage.geojson',
    sewer: '/data/neer-vazhvu/mumbai/mumbai-drainage.geojson',
    river: '/data/neer-vazhvu/mumbai/mumbai-rivers.geojson',
    flood: '/data/neer-vazhvu/mumbai/mumbai-flood-hotspots.geojson',
    reservoir: '/data/neer-vazhvu/mumbai/mumbai-flood-hotspots.geojson',
  },
  hyderabad: {
    drainage: '/data/neer-vazhvu/hyderabad/hyderabad-drainage.geojson',
    sewer: '/data/neer-vazhvu/hyderabad/hyderabad-sewerage.geojson',
    river: '/data/neer-vazhvu/hyderabad/hyderabad-rivers.geojson',
    flood: '/data/neer-vazhvu/hyderabad/hyderabad-flood-hazard-zones.geojson',
    reservoir: '/data/neer-vazhvu/hyderabad/hyderabad-rivers.geojson',
  },
  pune: {
    drainage: '/data/neer-vazhvu/pune/pune-drainage.geojson',
    sewer: '/data/neer-vazhvu/pune/pune-sewerage.geojson',
    river: '/data/neer-vazhvu/pune/pune-rivers.geojson',
    flood: '/data/neer-vazhvu/pune/pune-flood-hazard-zones.geojson',
    reservoir: '/data/neer-vazhvu/pune/pune-rivers.geojson',
  },
};

export function isNeerVazhvuCity(cityId: string): boolean {
  return Boolean(NEER_VAZHVU_CITY_LAYERS[cityId]);
}

export async function fetchNeerVazhvuGeoJson(cityId: string, layer: NeerVazhvuLayerKey): Promise<GeoJSON.FeatureCollection | null> {
  const layerPath = NEER_VAZHVU_CITY_LAYERS[cityId]?.[layer];
  if (!layerPath) return null;

  try {
    const res = await fetch(layerPath);
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === 'object' && 'type' in data ? (data as GeoJSON.FeatureCollection) : null;
  } catch {
    return null;
  }
}
