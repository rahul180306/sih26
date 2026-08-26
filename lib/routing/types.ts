export type VehicleType = 'ambulance' | 'bus' | 'car' | 'bike';

export interface VehicleProfile {
  id: VehicleType;
  name: string;
  maxWaterDepthMeters: number;
  icon: string;
  speedKmh: number;
  description: string;
  emergencyPriority: boolean;
}

export interface RouteHazardPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  predictedDepthMeters: number;
  severity: 'Critical' | 'Severe' | 'Moderate' | 'Low';
  description: string;
  catchmentId?: string;
}

export interface NavigationStep {
  instruction: string;
  distanceKm: number;
  durationMin: number;
  elevatedFlyover: boolean;
  waterDepthMeters: number;
  hazardWarning?: string;
  isSafe: boolean;
}

export interface RoutePath {
  id: string;
  name: string;
  type: 'inundated' | 'safe';
  distanceKm: number;
  durationMin: number;
  maxWaterDepthMeters: number;
  averageWaterDepthMeters: number;
  safetyScorePct: number; // 0 - 100%
  passable: boolean;
  statusLabel: string;
  color: string;
  coordinates: [number, number][]; // [lng, lat]
  hazards: RouteHazardPoint[];
  steps: NavigationStep[];
  elevationGainMeters: number;
  co2SavedKg?: number;
}

export interface EmergencyHubPreset {
  id: string;
  name: string;
  category: 'hospital' | 'shelter' | 'transit' | 'subway' | 'commercial' | 'hotspot';
  cityId: string;
  lat: number;
  lng: number;
  address: string;
}

export interface FloodRouteComparison {
  cityId: string;
  origin: EmergencyHubPreset;
  destination: EmergencyHubPreset;
  vehicle: VehicleProfile;
  standardInundatedRoute: RoutePath;
  jalrakshakSafeRoute: RoutePath;
  waterDepthReductionPct: number;
  timeDeltaMin: number;
  elevationBypassGainM: number;
  summaryReason: string;
}
