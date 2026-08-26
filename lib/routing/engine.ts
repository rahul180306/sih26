import {
  VehicleType,
  VehicleProfile,
  EmergencyHubPreset,
  FloodRouteComparison,
  RoutePath,
  RouteHazardPoint,
  NavigationStep,
} from './types';

export const VEHICLE_PROFILES: Record<VehicleType, VehicleProfile> = {
  ambulance: {
    id: 'ambulance',
    name: 'Emergency Ambulance / 4x4',
    maxWaterDepthMeters: 0.45,
    icon: 'Ambulance',
    speedKmh: 48,
    description: 'High air-intake & emergency right-of-way priority (clears up to 0.45m)',
    emergencyPriority: true,
  },
  bus: {
    id: 'bus',
    name: 'Municipal Transit / Heavy Bus',
    maxWaterDepthMeters: 0.60,
    icon: 'Bus',
    speedKmh: 35,
    description: 'High chassis clearance; safe up to 0.60m for mass transit & evacuation',
    emergencyPriority: false,
  },
  car: {
    id: 'car',
    name: 'Passenger Car / Sedan',
    maxWaterDepthMeters: 0.20,
    icon: 'Car',
    speedKmh: 42,
    description: 'Standard exhaust/air-filter clearance (stalls if depth > 0.20m)',
    emergencyPriority: false,
  },
  bike: {
    id: 'bike',
    name: 'Two-Wheeler / Motorcycle',
    maxWaterDepthMeters: 0.10,
    icon: 'Bike',
    speedKmh: 30,
    description: 'Critical skidding & engine water ingestion risk above 0.10m',
    emergencyPriority: false,
  },
};

export const CITY_EMERGENCY_HUBS: Record<string, EmergencyHubPreset[]> = {
  chennai: [
    { id: 'chennai-chromepet', name: 'Chromepet Govt Hospital & Safe Shelter', category: 'hospital', cityId: 'chennai', lat: 12.9516, lng: 80.1412, address: 'GST Road, Chromepet' },
    { id: 'chennai-tambaram', name: 'Tambaram Taluk Hospital & Relief Camp', category: 'shelter', cityId: 'chennai', lat: 12.9249, lng: 80.1280, address: 'GST Road, Tambaram Sanatorium' },
    { id: 'chennai-mijot', name: 'MIOT International Trauma Center', category: 'hospital', cityId: 'chennai', lat: 13.0185, lng: 80.1804, address: 'Mount Poonamallee Rd, Manapakkam' },
    { id: 'chennai-guindy', name: 'Guindy King Institute Disaster Relief Hub', category: 'shelter', cityId: 'chennai', lat: 13.0102, lng: 80.2158, address: 'Guindy Institutional Area' },
    { id: 'chennai-velachery', name: 'Velachery Community Hall Relief Shelter', category: 'shelter', cityId: 'chennai', lat: 12.9790, lng: 80.2210, address: '100 Feet Bypass Road, Velachery' },
    { id: 'chennai-apollo', name: 'Apollo Hospital (Greams Road)', category: 'hospital', cityId: 'chennai', lat: 13.0600, lng: 80.2520, address: 'Greams Road, Thousand Lights' },
    { id: 'chennai-rggh', name: 'Rajiv Gandhi Govt General Hospital (RGGH)', category: 'hospital', cityId: 'chennai', lat: 13.0815, lng: 80.2785, address: 'EVR Periyar Salai, Park Town' },
    { id: 'chennai-kilpauk', name: 'Kilpauk Govt Medical College & Safehouse', category: 'hospital', cityId: 'chennai', lat: 13.0790, lng: 80.2440, address: 'EVR Periyar Salai, Kilpauk' },
    { id: 'chennai-stanley', name: 'Stanley Govt Hospital & Relief Camp', category: 'shelter', cityId: 'chennai', lat: 13.1070, lng: 80.2870, address: 'Old Jail Road, Royapuram' },
    { id: 'chennai-omandurar', name: 'Omandurar Multi Super Speciality Hospital', category: 'hospital', cityId: 'chennai', lat: 13.0694, lng: 80.2740, address: 'Anna Salai, Triplicane' },
  ],
  mumbai: [
    { id: 'mumbai-kem', name: 'KEM Hospital & Medical College', category: 'hospital', cityId: 'mumbai', lat: 19.0022, lng: 72.8431, address: 'Acharya Donde Marg, Parel' },
    { id: 'mumbai-sion', name: 'Sion Trauma Care Hospital & Safe Hub', category: 'hospital', cityId: 'mumbai', lat: 19.0380, lng: 72.8600, address: 'Sion West Circle, Mumbai' },
    { id: 'mumbai-shelter', name: 'Dharavi Sports Complex Relief Camp', category: 'shelter', cityId: 'mumbai', lat: 19.0435, lng: 72.8550, address: '60 Feet Road, Dharavi' },
    { id: 'mumbai-cooper', name: 'RN Cooper Hospital & Trauma Center', category: 'hospital', cityId: 'mumbai', lat: 19.1076, lng: 72.8378, address: 'U10 Road, Juhu/Andheri West' },
    { id: 'mumbai-bkc', name: 'BKC Emergency Relief Pavilion', category: 'shelter', cityId: 'mumbai', lat: 19.0657, lng: 72.8680, address: 'Bandra Kurla Complex, G Block' },
    { id: 'mumbai-lilavati', name: 'Lilavati Hospital & Relief Safehouse', category: 'hospital', cityId: 'mumbai', lat: 19.0510, lng: 72.8290, address: 'Bandstand, Bandra West' },
    { id: 'mumbai-rajawadi', name: 'Rajawadi Hospital & Shelter', category: 'hospital', cityId: 'mumbai', lat: 19.0770, lng: 72.9080, address: 'Ghatkopar East' },
    { id: 'mumbai-nair', name: 'BYL Nair Hospital & Emergency Shelter', category: 'hospital', cityId: 'mumbai', lat: 18.9740, lng: 72.8220, address: 'Mumbai Central South' },
  ],
  bengaluru: [
    { id: 'blr-stjohns', name: 'St. John’s Medical College & Disaster Hub', category: 'hospital', cityId: 'bengaluru', lat: 12.9320, lng: 77.6180, address: 'Sarjapur Road, Koramangala' },
    { id: 'blr-manipal', name: 'Manipal Hospital & Emergency Unit', category: 'hospital', cityId: 'bengaluru', lat: 12.9585, lng: 77.6520, address: 'HAL Airport Road, Kodihalli' },
    { id: 'blr-victoria', name: 'Victoria Govt Hospital & Relief Camp', category: 'shelter', cityId: 'bengaluru', lat: 12.9620, lng: 77.5740, address: 'Fort Road, Kalasipalya' },
    { id: 'blr-ecity', name: 'Electronic City Phase 1 Safe Shelter', category: 'shelter', cityId: 'bengaluru', lat: 12.8452, lng: 77.6602, address: 'Elevated Tollway, Bangalore South' },
    { id: 'blr-bowring', name: 'Bowring Hospital Emergency Hub', category: 'hospital', cityId: 'bengaluru', lat: 12.9830, lng: 77.6010, address: 'Lady Curzon Rd, Tasker Town' },
    { id: 'blr-yelahanka', name: 'Yelahanka General Hospital Relief Safehouse', category: 'shelter', cityId: 'bengaluru', lat: 13.1000, lng: 77.5950, address: 'Yelahanka Old Town, North' },
  ],
  delhi: [
    { id: 'delhi-aiims', name: 'AIIMS Apex Trauma Center & Shelter', category: 'hospital', cityId: 'delhi', lat: 28.5672, lng: 77.2100, address: 'Sri Aurobindo Marg, Ansari Nagar' },
    { id: 'delhi-safdarjung', name: 'Safdarjung Hospital Relief Shelter', category: 'hospital', cityId: 'delhi', lat: 28.5690, lng: 77.2070, address: 'Ring Road, Opposite AIIMS' },
    { id: 'delhi-lnjp', name: 'LNJP Civil Hospital & Disaster Camp', category: 'shelter', cityId: 'delhi', lat: 28.6380, lng: 77.2390, address: 'Jawaharlal Nehru Marg, Delhi Gate' },
    { id: 'delhi-rml', name: 'Dr. Ram Manohar Lohia (RML) Hospital', category: 'hospital', cityId: 'delhi', lat: 28.6250, lng: 77.2000, address: 'Baba Kharak Singh Marg, CP' },
    { id: 'delhi-gtb', name: 'GTB Hospital & Emergency Safehouse', category: 'hospital', cityId: 'delhi', lat: 28.6840, lng: 77.3080, address: 'Shahdara, Dilshad Garden' },
  ],
};

// Generates smooth interpolated intermediate coordinates between two points with curved avoidance
function interpolatePath(
  start: [number, number],
  end: [number, number],
  divergence: 'direct' | 'elevated-east' | 'elevated-west' | 'freeway'
): [number, number][] {
  const steps = 14;
  const coords: [number, number][] = [];
  const [sLng, sLat] = start;
  const [eLng, eLat] = end;

  const midLng = (sLng + eLng) / 2;
  const midLat = (sLat + eLat) / 2;

  let offsetLng = 0;
  let offsetLat = 0;

  if (divergence === 'elevated-east') {
    offsetLng = 0.018;
    offsetLat = 0.006;
  } else if (divergence === 'elevated-west') {
    offsetLng = -0.016;
    offsetLat = 0.005;
  } else if (divergence === 'freeway') {
    offsetLng = 0.024;
    offsetLat = -0.008;
  }

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic bezier curve interpolation
    const lng = (1 - t) * (1 - t) * sLng + 2 * (1 - t) * t * (midLng + offsetLng) + t * t * eLng;
    const lat = (1 - t) * (1 - t) * sLat + 2 * (1 - t) * t * (midLat + offsetLat) + t * t * eLat;
    coords.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
  }

  return coords;
}

export function calculateFloodSafeRoute(
  cityId: string,
  originId: string,
  destinationId: string,
  vehicleType: VehicleType = 'ambulance'
): FloodRouteComparison {
  const cityHubs = CITY_EMERGENCY_HUBS[cityId] || CITY_EMERGENCY_HUBS['mumbai'];
  const origin = cityHubs.find(h => h.id === originId) || cityHubs[0];
  let destination = cityHubs.find(h => h.id === destinationId);
  if (!destination || destination.id === origin.id) {
    destination = cityHubs.find(h => h.id !== origin.id) || cityHubs[1];
  }

  const vehicle = VEHICLE_PROFILES[vehicleType];

  const startCoord: [number, number] = [origin.lng, origin.lat];
  const endCoord: [number, number] = [destination.lng, destination.lat];

  // Base geographical distance in KM using Haversine approximation
  const dLat = (destination.lat - origin.lat) * (Math.PI / 180);
  const dLng = (destination.lng - origin.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(origin.lat * (Math.PI / 180)) * Math.cos(destination.lat * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDistanceKm = Number((6371 * c * 1.25).toFixed(1)); // road curvature factor 1.25

  // 1. INUNDATED (DIRECT) ROUTE MODELING
  const inundatedCoords = interpolatePath(startCoord, endCoord, 'direct');
  
  // Hazards encountered along standard low-lying routes
  const midIndex = Math.floor(inundatedCoords.length / 2);
  const q1Index = Math.floor(inundatedCoords.length / 4);
  const q3Index = Math.floor((3 * inundatedCoords.length) / 4);

  const cityHazardProfiles: Record<string, { name: string; depth: number; desc: string }[]> = {
    mumbai: [
      { name: 'Hindmata / Dadar TT Sump', depth: 0.86, desc: 'Underground retention tanks overflowed. Surcharge 94%.' },
      { name: 'Kurla LBS Culvert', depth: 0.78, desc: 'Mithi river backflow overflowing sill level by 0.35m.' },
      { name: 'Milan Underpass', depth: 0.62, desc: 'Subway stormwater pump overwhelmed.' },
    ],
    chennai: [
      { name: 'Usman Road Underpass', depth: 0.75, desc: 'Storm drain discharge blocked by high canal stage.' },
      { name: 'Velachery Main Sump', depth: 0.82, desc: 'Lake runoff overflowing onto arterial road.' },
    ],
    bengaluru: [
      { name: 'Silk Board Lower Underpass', depth: 0.68, desc: 'Madiwala lake overflow causing severe ponding.' },
      { name: 'Bellandur Eco-Drain Overspill', depth: 0.72, desc: 'Storm culvert crossflow.' },
    ],
    delhi: [
      { name: 'ITO Ring Road Underpass', depth: 0.70, desc: 'Yamuna floodstage backpressure through outfall.' },
      { name: 'Minto Bridge Sump', depth: 0.84, desc: 'Extreme depression water accumulation.' },
    ],
  };

  const hazardsList = cityHazardProfiles[cityId] || cityHazardProfiles['mumbai'];
  const primaryHazard = hazardsList[0];
  const secondaryHazard = hazardsList[1] || hazardsList[0];

  const maxInundatedDepth = primaryHazard.depth;
  const standardPassable = vehicle.maxWaterDepthMeters >= maxInundatedDepth;

  const inundatedHazards: RouteHazardPoint[] = [
    {
      id: 'h-1',
      name: primaryHazard.name,
      lat: inundatedCoords[midIndex][1],
      lng: inundatedCoords[midIndex][0],
      predictedDepthMeters: primaryHazard.depth,
      severity: primaryHazard.depth > 0.6 ? 'Critical' : 'Severe',
      description: primaryHazard.desc,
    },
    {
      id: 'h-2',
      name: secondaryHazard.name,
      lat: inundatedCoords[q1Index][1],
      lng: inundatedCoords[q1Index][0],
      predictedDepthMeters: secondaryHazard.depth * 0.75,
      severity: 'Severe',
      description: secondaryHazard.desc,
    },
  ];

  const standardSteps: NavigationStep[] = [
    {
      instruction: `Depart from ${origin.name} via standard arterial road`,
      distanceKm: Number((directDistanceKm * 0.2).toFixed(1)),
      durationMin: 4,
      elevatedFlyover: false,
      waterDepthMeters: 0.12,
      isSafe: true,
    },
    {
      instruction: `Enter ${primaryHazard.name} low-lying corridor`,
      distanceKm: Number((directDistanceKm * 0.4).toFixed(1)),
      durationMin: 14,
      elevatedFlyover: false,
      waterDepthMeters: primaryHazard.depth,
      hazardWarning: `CRITICAL INUNDATION (${primaryHazard.depth}m): Vehicle hydro-lock and stalling risk.`,
      isSafe: false,
    },
    {
      instruction: `Continue through secondary waterlogged depression toward ${destination.name}`,
      distanceKm: Number((directDistanceKm * 0.4).toFixed(1)),
      durationMin: 12,
      elevatedFlyover: false,
      waterDepthMeters: secondaryHazard.depth * 0.75,
      hazardWarning: `High risk of stalling for ${vehicle.name}.`,
      isSafe: false,
    },
  ];

  const standardInundatedRoute: RoutePath = {
    id: 'route-inundated-standard',
    name: 'Direct Ground Arterial (Inundated Chokepoint)',
    type: 'inundated',
    distanceKm: directDistanceKm,
    durationMin: Math.round((directDistanceKm / (vehicle.speedKmh * 0.45)) * 60), // heavy delay due to water
    maxWaterDepthMeters: maxInundatedDepth,
    averageWaterDepthMeters: Number((maxInundatedDepth * 0.62).toFixed(2)),
    safetyScorePct: standardPassable ? 35 : 12,
    passable: standardPassable,
    statusLabel: standardPassable ? 'SEVERE DELAY · HIGH RESISTANCE' : 'IMPASSABLE · HYDROSTATIC HAZARD',
    color: '#EF4444',
    coordinates: inundatedCoords,
    hazards: inundatedHazards,
    steps: standardSteps,
    elevationGainMeters: 2.1,
  };

  // 2. JALRAKSHAK FLOOD-SAFE (ELEVATED BYPASS) ROUTE MODELING
  const safeDistanceKm = Number((directDistanceKm * 1.18).toFixed(1));
  const safeCoords = interpolatePath(startCoord, endCoord, 'freeway');
  const safeMaxDepth = 0.08; // dry or light runoff

  const safeSteps: NavigationStep[] = [
    {
      instruction: `Depart ${origin.name} and take designated ramp to Elevated Connector / Flyover`,
      distanceKm: Number((safeDistanceKm * 0.25).toFixed(1)),
      durationMin: 3,
      elevatedFlyover: true,
      waterDepthMeters: 0.02,
      isSafe: true,
    },
    {
      instruction: `Bypass inundated ${primaryHazard.name} via high-level elevated ridge corridor`,
      distanceKm: Number((safeDistanceKm * 0.5).toFixed(1)),
      durationMin: 6,
      elevatedFlyover: true,
      waterDepthMeters: 0.04,
      isSafe: true,
    },
    {
      instruction: `Descend via well-drained arterial link directly into ${destination.name}`,
      distanceKm: Number((safeDistanceKm * 0.25).toFixed(1)),
      durationMin: 4,
      elevatedFlyover: false,
      waterDepthMeters: 0.08,
      isSafe: true,
    },
  ];

  const jalrakshakSafeRoute: RoutePath = {
    id: 'route-jalrakshak-safe',
    name: 'JalRakshak Dynamic AI Safe Corridor (Elevated Bypass)',
    type: 'safe',
    distanceKm: safeDistanceKm,
    durationMin: Math.round((safeDistanceKm / (vehicle.speedKmh * 0.85)) * 60),
    maxWaterDepthMeters: safeMaxDepth,
    averageWaterDepthMeters: 0.04,
    safetyScorePct: 98,
    passable: true,
    statusLabel: '100% CLEAR · OPTIMAL EMERGENCY DISPATCH',
    color: '#10B981',
    coordinates: safeCoords,
    hazards: [],
    steps: safeSteps,
    elevationGainMeters: 14.8,
    co2SavedKg: 1.8,
  };

  const depthReduction = Math.round(((maxInundatedDepth - safeMaxDepth) / maxInundatedDepth) * 100);
  const timeDelta = standardInundatedRoute.durationMin - jalrakshakSafeRoute.durationMin;

  return {
    cityId,
    origin,
    destination,
    vehicle,
    standardInundatedRoute,
    jalrakshakSafeRoute,
    waterDepthReductionPct: depthReduction,
    timeDeltaMin: timeDelta,
    elevationBypassGainM: 14.8,
    summaryReason: `Bypasses 2 critical inundation sumps (${primaryHazard.name} @ ${primaryHazard.depth}m) via elevated corridor, reducing vehicle water exposure by ${depthReduction}%.`,
  };
}
