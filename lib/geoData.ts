// Geographic & Geospatial Intelligence Data for JalRakshak
// Supporting Progressive Geographic Drill-Down: India (Level 0) -> State (Level 1) -> City/Catchment (Level 2)


export interface DrainageNode {
  id: string;
  name: string;
  type: 'INLET' | 'MANHOLE' | 'JUNCTION' | 'OUTFALL' | 'PUMP';
  lat: number;
  lng: number;
  groundElevation_m: number;
  invertElevation_m: number;
  elevation_m?: number; // backwards compatibility
  groundLevel_m?: number; // backwards compatibility
  currentWaterLevel_m?: number;
  maxWaterLevel_m?: number;
  freeboard_m?: number; // GroundLevel - WaterLevel
  incomingFlow_m3s?: number;
  outgoingFlow_m3s?: number;
  inletCapacity_m3s?: number;
  inletBlockagePct?: number;
  effectiveInletCapacity_m3s?: number;
  surfaceWaterDepth_cm?: number;
  surchargeDepth_m?: number;
  status?: string;
  catchmentId?: string;
  affectedRoad?: string;
  utilizationPct?: number;
  capacity_m3s?: number;
}

export interface DrainageEdgeForecast {
  timeMin: number;
  rainfall_mmhr: number;
  flow_m3s: number;
  utilizationPct: number;
  waterLevel_m: number;
  streetDepth_cm: number;
  status: string;
}

export interface DrainageEdge {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  type: 'trunk' | 'tributary' | 'culvert' | 'pipe' | 'outfall';
  length_m: number;
  diameter_m: number;
  depth_m?: number;
  width_m?: number;
  shape: 'circular' | 'rectangular' | 'trapezoidal';
  material?: 'RCC' | 'Masonry' | 'HDPE' | 'Box Culvert';
  slope: number;
  manningN: number;
  invertUpstream_m: number;
  invertDownstream_m: number;
  pipeCrown_m?: number;
  waterLevel_m?: number;
  freeboard_m?: number;
  blockagePct: number;
  effectiveCapacity_m3s?: number;
  currentFlow_m3s?: number;
  capacity_m3s?: number;
  velocity_ms?: number;
  waterDepth_m?: number;
  hydraulicGrade_m?: number;
  utilizationPct?: number;
  timeToSurcharge_min?: number | null;
  surchargeRisk?: string;
  status?: string;
  affectedRoad?: string;
  predictedStreetDepth_cm?: number;
  floodDuration_min?: number;
  floodSeverity?: 'SAFE' | 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  forecasts?: DrainageEdgeForecast[];
  coordinates: [number, number][];
}

export interface CatchmentArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  area_km2?: number;
  imperviousnessPct?: number;
  rainfall_mmhr?: number;
  runoffCoefficient?: number;
  targetNodeId?: string;
  expectedRunoff_m3s?: number;
  depth: string;
  depthVal: number;
  risk: 'High' | 'Medium' | 'Low' | 'Safe';
  riskColor: string;
  drainage: string;
  affectedRoads: number;
  description: string;
}

export interface DeploymentCity {
  id: string;
  name: string;
  stateId: string;
  stateName: string;
  lat: number;
  lng: number;
  type: 'primary' | 'demo' | 'unconfigured';
  statusLabel: string;
  tag: string;
  risk: 'High' | 'Medium' | 'Low' | 'Safe';
  riskColor: string;
  maxDepth: string;
  rainfall: string;
  surcharge: string;
  affectedRoads: number;
  confidence: string;
  catchments: CatchmentArea[];
  drainageNodes?: DrainageNode[];
  drainageEdges?: DrainageEdge[];
  drainageNetwork: {
    name: string;
    status: string;
    type: 'trunk' | 'tributary' | 'culvert' | 'outfall';
    lengthKm: number;
    capacityPct: number;
    flowVelocity_ms: number;
    coordinates: [number, number][];
  }[];
  floodPolygons: {
    depth: number;
    color: string;
    coordinates: [number, number][][];
  }[];
  drainageAssets?: {
    tanks: number;
    tankCapacityPct: number;
    pumps: number;
    activePumps: number;
    tidalGates: number;
    gateStatus: 'Open' | 'Closed' | 'Partial';
    totalLengthKm: number;
    maintenanceAlerts: number;
  };
}

export interface StateEntity {
  id: string;
  name: string;
  code: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  cities: string[];
}

export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [68.1, 7.5], // Southwest [lng, lat]
  [97.4, 35.5], // Northeast [lng, lat]
];

export const INDIA_CENTER: [number, number] = [79.2, 22.0];
export const INDIA_ZOOM = 4.3;

export const STATES_DATA: Record<string, StateEntity> = {
  maharashtra: {
    id: 'maharashtra',
    name: 'Maharashtra',
    code: 'MH',
    center: [75.7, 19.6],
    zoom: 6.8,
    cities: ['mumbai', 'pune', 'nagpur', 'nashik', 'thane'],
  },
  tamilnadu: {
    id: 'tamilnadu',
    name: 'Tamil Nadu',
    code: 'TN',
    center: [78.6, 11.1],
    zoom: 7.0,
    cities: ['chennai', 'coimbatore', 'madurai'],
  },
  karnataka: {
    id: 'karnataka',
    name: 'Karnataka',
    code: 'KA',
    center: [75.7, 15.3],
    zoom: 6.9,
    cities: ['bengaluru', 'mysuru'],
  },
  delhi: {
    id: 'delhi',
    name: 'Delhi NCR',
    code: 'DL',
    center: [77.10, 28.64],
    zoom: 9.8,
    cities: ['delhi'],
  },
  westbengal: {
    id: 'westbengal',
    name: 'West Bengal',
    code: 'WB',
    center: [87.8, 23.8],
    zoom: 7.1,
    cities: ['kolkata'],
  },
};

export const CITIES_DATA: Record<string, DeploymentCity> = {
  mumbai: {
    id: 'mumbai',
    name: 'Mumbai Metro',
    stateId: 'maharashtra',
    stateName: 'Maharashtra',
    lat: 19.0760,
    lng: 72.8777,
    type: 'primary',
    statusLabel: 'PRIMARY OPERATIONAL CATCHMENT',
    tag: 'LIVE / REPLAY DIGITAL TWIN',
    risk: 'High',
    riskColor: '#EF4444',
    maxDepth: '0.86 m',
    rainfall: '74 mm/hr',
    surcharge: '91%',
    affectedRoads: 42,
    confidence: '89%',
    catchments: [
      {
        id: 'hindmata',
        name: 'Hindmata / Dadar TT Circle',
        lat: 19.0178,
        lng: 72.8478,
        area_km2: 1.8,
        imperviousnessPct: 82,
        rainfall_mmhr: 42,
        runoffCoefficient: 0.78,
        targetNodeId: 'MH-102',
        depth: '0.86 m',
        depthVal: 0.86,
        risk: 'High',
        riskColor: '#EF4444',
        drainage: '94% Capacity',
        affectedRoads: 14,
        description: 'Underground holding tanks at capacity; surface runoff pooling towards BPCL storm culvert.',
      },
      {
        id: 'kurla-mithi',
        name: 'Kurla West (Mithi River Bank)',
        lat: 19.0688,
        lng: 72.8745,
        area_km2: 2.4,
        imperviousnessPct: 75,
        rainfall_mmhr: 48,
        runoffCoefficient: 0.70,
        targetNodeId: 'JUNCTION-201',
        depth: '0.78 m',
        depthVal: 0.78,
        risk: 'High',
        riskColor: '#EF4444',
        drainage: '91% Capacity',
        affectedRoads: 12,
        description: 'Mithi River high tide water level exceeding floodwall sill elevation by 0.35 m.',
      },
      {
        id: 'milan-subway',
        name: 'Milan Subway (Santacruz)',
        lat: 19.0833,
        lng: 72.8420,
        area_km2: 1.2,
        imperviousnessPct: 88,
        rainfall_mmhr: 55,
        runoffCoefficient: 0.85,
        targetNodeId: 'MH-301',
        depth: '0.62 m',
        depthVal: 0.62,
        risk: 'Medium',
        riskColor: '#F59E0B',
        drainage: '82% Capacity',
        affectedRoads: 6,
        description: 'High discharge pump operational; traffic diverted through SV Road flyover.',
      },
      {
        id: 'bkc-junction',
        name: 'BKC Complex & Vakola Nullah',
        lat: 19.0657,
        lng: 72.8680,
        area_km2: 3.1,
        imperviousnessPct: 65,
        rainfall_mmhr: 38,
        runoffCoefficient: 0.60,
        targetNodeId: 'MH-401',
        depth: '0.40 m',
        depthVal: 0.40,
        risk: 'Medium',
        riskColor: '#F59E0B',
        drainage: '76% Capacity',
        affectedRoads: 7,
        description: 'Vakola channel inflow buffered by Dharavi retention culverts.',
      },
      {
        id: 'sion-circle',
        name: 'Sion Circle / Gandhi Market',
        lat: 19.0378,
        lng: 72.8611,
        area_km2: 1.5,
        imperviousnessPct: 80,
        rainfall_mmhr: 60,
        runoffCoefficient: 0.75,
        targetNodeId: 'MH-501',
        depth: '0.70 m',
        depthVal: 0.70,
        risk: 'High',
        riskColor: '#EF4444',
        drainage: '88% Capacity',
        affectedRoads: 9,
        description: 'Low-lying depression between Central Railway tracks and King Circle sumps.',
      },
      {
        id: 'marine-drive',
        name: 'Marine Drive Coastal Front',
        lat: 18.9438,
        lng: 72.8232,
        area_km2: 0.8,
        imperviousnessPct: 90,
        rainfall_mmhr: 45,
        runoffCoefficient: 0.88,
        targetNodeId: 'INLET-601',
        depth: '0.10 m',
        depthVal: 0.10,
        risk: 'Safe',
        riskColor: '#059669',
        drainage: '22% Capacity',
        affectedRoads: 1,
        description: 'Coastal sea-wall outfalls discharging smoothly into Arabian Sea.',
      },
    ],
    drainageNodes: [
      { id: 'INLET-102A', name: 'Hindmata Inlet A', type: 'INLET', lat: 19.0175, lng: 72.8475, groundElevation_m: 9.10, invertElevation_m: 8.50, elevation_m: 8.50, groundLevel_m: 9.10, inletCapacity_m3s: 0.85, inletBlockagePct: 20, catchmentId: 'hindmata', affectedRoad: 'Hindmata Flyover Junction' },
      { id: 'INLET-102B', name: 'Hindmata Inlet B', type: 'INLET', lat: 19.0180, lng: 72.8480, groundElevation_m: 9.20, invertElevation_m: 8.60, elevation_m: 8.60, groundLevel_m: 9.20, inletCapacity_m3s: 0.90, inletBlockagePct: 15, catchmentId: 'hindmata', affectedRoad: 'Dadar TT East Service Road' },
      { id: 'MH-102', name: 'Hindmata Central Manhole', type: 'MANHOLE', lat: 19.0178, lng: 72.8478, groundElevation_m: 9.10, invertElevation_m: 6.91, maxWaterLevel_m: 9.10, elevation_m: 8.42, groundLevel_m: 9.10, catchmentId: 'hindmata', affectedRoad: 'Hindmata Road / Dr. Ambedkar Rd' },
      { id: 'MH-103', name: 'Dadar Collector Manhole', type: 'MANHOLE', lat: 19.0220, lng: 72.8450, groundElevation_m: 8.50, invertElevation_m: 5.80, maxWaterLevel_m: 8.50, elevation_m: 7.50, groundLevel_m: 8.50, catchmentId: 'hindmata', affectedRoad: 'Dadar TT Circle / Tilak Bridge' },
      { id: 'JUNCTION-201', name: 'Kurla Confluence Junction', type: 'JUNCTION', lat: 19.0688, lng: 72.8745, groundElevation_m: 5.20, invertElevation_m: 2.80, maxWaterLevel_m: 5.20, elevation_m: 4.10, groundLevel_m: 5.20, catchmentId: 'kurla-mithi', affectedRoad: 'LBS Marg / Kurla Underpass' },
      { id: 'MH-301', name: 'Milan Subway Basin Vault', type: 'MANHOLE', lat: 19.0833, lng: 72.8420, groundElevation_m: 7.10, invertElevation_m: 4.10, maxWaterLevel_m: 7.10, elevation_m: 6.20, groundLevel_m: 7.10, catchmentId: 'milan-subway', affectedRoad: 'Milan Subway Underpass' },
      { id: 'MH-401', name: 'BKC Vakola Retarder Vault', type: 'MANHOLE', lat: 19.0657, lng: 72.8680, groundElevation_m: 6.80, invertElevation_m: 3.90, maxWaterLevel_m: 6.80, elevation_m: 5.50, groundLevel_m: 6.80, catchmentId: 'bkc-junction', affectedRoad: 'BKC Central Avenue' },
      { id: 'MH-501', name: 'Sion Deep Shaft', type: 'MANHOLE', lat: 19.0378, lng: 72.8611, groundElevation_m: 8.00, invertElevation_m: 5.20, maxWaterLevel_m: 8.00, elevation_m: 6.80, groundLevel_m: 8.00, catchmentId: 'sion-circle', affectedRoad: 'Sion Circle / Gandhi Market' },
      { id: 'PUMP-16', name: 'Love Grove High-Discharge Pump Station', type: 'PUMP', lat: 19.0050, lng: 72.8280, groundElevation_m: 4.50, invertElevation_m: 0.50, maxWaterLevel_m: 4.50, elevation_m: 2.50, groundLevel_m: 4.50, inletCapacity_m3s: 18.0, catchmentId: 'hindmata', affectedRoad: 'Love Grove Sluice Gate Access Rd' },
      { id: 'INLET-601', name: 'Marine Drive Grate Inlet', type: 'INLET', lat: 18.9438, lng: 72.8232, groundElevation_m: 4.00, invertElevation_m: 3.20, elevation_m: 3.50, groundLevel_m: 4.00, inletCapacity_m3s: 1.20, inletBlockagePct: 5, catchmentId: 'marine-drive', affectedRoad: 'Marine Drive Promenade' },
      { id: 'OUTFALL-07', name: 'Mahim Creek Tidal Outfall', type: 'OUTFALL', lat: 19.0380, lng: 72.8380, groundElevation_m: 3.00, invertElevation_m: 0.20, maxWaterLevel_m: 3.00, elevation_m: 2.10, groundLevel_m: 3.00, inletCapacity_m3s: 25.0, catchmentId: 'kurla-mithi', affectedRoad: 'Mahim Causeway Bridge Front' },
      { id: 'OUTFALL-09', name: 'Love Grove Arabian Sea Outfall', type: 'OUTFALL', lat: 18.9950, lng: 72.8180, groundElevation_m: 2.80, invertElevation_m: -0.10, maxWaterLevel_m: 2.80, elevation_m: 1.80, groundLevel_m: 2.80, inletCapacity_m3s: 20.0, catchmentId: 'hindmata', affectedRoad: 'Worli Sea Face Promenade' },
    ],
    drainageEdges: [
      {
        id: 'PIPE-P101', name: 'Hindmata Drop Culvert', fromNodeId: 'INLET-102A', toNodeId: 'MH-102', type: 'pipe',
        length_m: 650, diameter_m: 1.2, shape: 'circular', material: 'RCC Box Culvert', slope: 0.020, manningN: 0.013,
        invertUpstream_m: 8.50, invertDownstream_m: 8.00, blockagePct: 20, affectedRoad: 'Hindmata Flyover Approach / Dr. Ambedkar Rd',
        coordinates: [[72.8520, 19.0140], [72.8495, 19.0160], [72.8478, 19.0178]]
      },
      {
        id: 'PIPE-P102', name: 'Dadar TT Service Interceptor', fromNodeId: 'INLET-102B', toNodeId: 'MH-102', type: 'pipe',
        length_m: 850, diameter_m: 1.4, shape: 'circular', material: 'RCC', slope: 0.020, manningN: 0.013,
        invertUpstream_m: 8.60, invertDownstream_m: 8.00, blockagePct: 15, affectedRoad: 'Dadar TT East Service Road',
        coordinates: [[72.8530, 19.0250], [72.8500, 19.0210], [72.8478, 19.0178]]
      },
      {
        id: 'PIPE-P103', name: 'Hindmata-Dadar Trunk Interceptor', fromNodeId: 'MH-102', toNodeId: 'MH-103', type: 'trunk',
        length_m: 1400, diameter_m: 2.2, shape: 'circular', material: 'RCC', slope: 0.0015, manningN: 0.015,
        invertUpstream_m: 6.91, invertDownstream_m: 5.93, blockagePct: 25, affectedRoad: 'Hindmata Road / Dr. Ambedkar Rd',
        coordinates: [[72.8478, 19.0178], [72.8465, 19.0195], [72.8450, 19.0220]]
      },
      {
        id: 'PIPE-P104', name: 'Dadar-Mahim Subsurface Collector', fromNodeId: 'MH-103', toNodeId: 'OUTFALL-07', type: 'trunk',
        length_m: 3200, diameter_m: 2.6, shape: 'circular', material: 'Box Culvert', slope: 0.0010, manningN: 0.015,
        invertUpstream_m: 5.80, invertDownstream_m: 3.60, blockagePct: 10, affectedRoad: 'Dadar West - Mahim Link Road',
        coordinates: [[72.8450, 19.0220], [72.8430, 19.0270], [72.8400, 19.0330], [72.8380, 19.0380]]
      },
      {
        id: 'MITHI-TRUNK-001', name: 'Mithi River Primary Channel', fromNodeId: 'JUNCTION-201', toNodeId: 'OUTFALL-07', type: 'trunk',
        length_m: 17800, diameter_m: 0, width_m: 14.0, depth_m: 5.5, shape: 'rectangular', material: 'Masonry', slope: 0.0012, manningN: 0.035,
        invertUpstream_m: 2.80, invertDownstream_m: 0.20, blockagePct: 18, affectedRoad: 'LBS Marg / Bandra-Kurla Link',
        coordinates: [[72.8950, 19.1200], [72.8800, 19.0950], [72.8745, 19.0688], [72.8550, 19.0500], [72.8380, 19.0380]]
      },
      {
        id: 'VAKOLA-TRIB-002', name: 'Vakola Nullah Open Channel', fromNodeId: 'MH-401', toNodeId: 'JUNCTION-201', type: 'tributary',
        length_m: 6400, diameter_m: 0, width_m: 6.0, depth_m: 3.5, shape: 'rectangular', material: 'RCC', slope: 0.0020, manningN: 0.025,
        invertUpstream_m: 3.90, invertDownstream_m: 2.80, blockagePct: 12, affectedRoad: 'Santacruz-Chembur Link Road',
        coordinates: [[72.8600, 19.0850], [72.8680, 19.0657], [72.8745, 19.0688]]
      },
      {
        id: 'PIPE-P301', name: 'Milan Subway Pump Discharge Line', fromNodeId: 'MH-301', toNodeId: 'JUNCTION-201', type: 'culvert',
        length_m: 3850, diameter_m: 1.8, shape: 'circular', material: 'HDPE', slope: 0.0025, manningN: 0.011,
        invertUpstream_m: 4.10, invertDownstream_m: 2.80, blockagePct: 8, affectedRoad: 'Milan Subway / SV Road',
        coordinates: [[72.8420, 19.0833], [72.8550, 19.0750], [72.8745, 19.0688]]
      },
      {
        id: 'PIPE-P501', name: 'Sion Deep Collector to Mahim', fromNodeId: 'MH-501', toNodeId: 'OUTFALL-07', type: 'culvert',
        length_m: 3200, diameter_m: 2.0, shape: 'circular', material: 'RCC', slope: 0.0014, manningN: 0.014,
        invertUpstream_m: 5.20, invertDownstream_m: 0.86, blockagePct: 20, affectedRoad: 'King Circle / Gandhi Market',
        coordinates: [[72.8611, 19.0378], [72.8520, 19.0360], [72.8430, 19.0370], [72.8380, 19.0380]]
      },
      {
        id: 'OUTFALL-LINE-009', name: 'Love Grove Deep Sea Pressure Conduit', fromNodeId: 'PUMP-16', toNodeId: 'OUTFALL-09', type: 'outfall',
        length_m: 3500, diameter_m: 2.4, shape: 'circular', material: 'HDPE Lined Channel', slope: 0.0018, manningN: 0.012,
        invertUpstream_m: 0.50, invertDownstream_m: -0.10, blockagePct: 0, affectedRoad: 'Worli Sea Face / Khan Abdul Ghaffar Khan Rd',
        coordinates: [[72.8380, 19.0150], [72.8280, 19.0050], [72.8180, 18.9950]]
      }
    ],
    drainageNetwork: [
      {
        name: 'Mithi River Trunk Channel',
        status: 'Extreme Flow / Tide Surge',
        type: 'trunk',
        lengthKm: 17.8,
        capacityPct: 96,
        flowVelocity_ms: 3.2,
        coordinates: [
          [72.895, 19.120],
          [72.880, 19.095],
          [72.870, 19.070],
          [72.855, 19.050],
          [72.835, 19.040],
        ],
      },
      {
        name: 'Vakola Nullah Interceptor',
        status: 'Surcharged',
        type: 'tributary',
        lengthKm: 6.4,
        capacityPct: 91,
        flowVelocity_ms: 2.1,
        coordinates: [
          [72.860, 19.085],
          [72.868, 19.070],
          [72.860, 19.055],
        ],
      },
      {
        name: 'Hindmata Storm Culvert to Mahim Creek',
        status: 'Pumped Outfall Active',
        type: 'culvert',
        lengthKm: 3.1,
        capacityPct: 94,
        flowVelocity_ms: 1.8,
        coordinates: [
          [72.848, 19.018],
          [72.845, 19.030],
          [72.840, 19.042],
        ],
      },
      {
        name: 'Love Grove Pumping Sump Line',
        status: 'Active Discharge',
        type: 'outfall',
        lengthKm: 2.2,
        capacityPct: 78,
        flowVelocity_ms: 1.4,
        coordinates: [
          [72.828, 19.005],
          [72.818, 18.995],
        ],
      },
      {
        name: 'Mahim Creek Arabian Sea Outfall',
        status: 'Tidal Backflow Risk',
        type: 'outfall',
        lengthKm: 1.8,
        capacityPct: 82,
        flowVelocity_ms: 0.9,
        coordinates: [
          [72.838, 19.038],
          [72.832, 19.030],
          [72.820, 19.018],
        ],
      },
      {
        name: 'Poisar River Interceptor',
        status: 'Moderate Flow',
        type: 'tributary',
        lengthKm: 8.6,
        capacityPct: 62,
        flowVelocity_ms: 1.1,
        coordinates: [
          [72.855, 19.145],
          [72.845, 19.115],
          [72.840, 19.095],
        ],
      },
    ],
    drainageAssets: {
      tanks: 24,
      tankCapacityPct: 88,
      pumps: 18,
      activePumps: 16,
      tidalGates: 7,
      gateStatus: 'Partial',
      totalLengthKm: 39.9,
      maintenanceAlerts: 4,
    },
    floodPolygons: [
      {
        depth: 0.86,
        color: '#EF4444',
        coordinates: [[
          [72.842, 19.022],
          [72.854, 19.023],
          [72.852, 19.012],
          [72.840, 19.014],
          [72.842, 19.022],
        ]],
      },
      {
        depth: 0.78,
        color: '#DC2626',
        coordinates: [[
          [72.865, 19.075],
          [72.882, 19.074],
          [72.880, 19.062],
          [72.863, 19.064],
          [72.865, 19.075],
        ]],
      },
      {
        depth: 0.62,
        color: '#F59E0B',
        coordinates: [[
          [72.836, 19.088],
          [72.848, 19.089],
          [72.846, 19.078],
          [72.834, 19.079],
          [72.836, 19.088],
        ]],
      },
    ],
  },

  chennai: {
    id: 'chennai',
    name: 'Chennai Coastal Metro',
    stateId: 'tamilnadu',
    stateName: 'Tamil Nadu',
    lat: 13.045,
    lng: 80.235,
    type: 'demo',
    statusLabel: 'CALIBRATED PROTOTYPE (DEMO)',
    tag: 'CALIBRATED SCENARIOS',
    risk: 'High',
    riskColor: '#EF4444',
    maxDepth: '0.72 m',
    rainfall: '65 mm/hr',
    surcharge: '88%',
    affectedRoads: 32,
    confidence: '78%',
    catchments: [
      {
        id: 't-nagar',
        name: 'T. Nagar (Ward 112)',
        lat: 13.0418,
        lng: 80.2341,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.72 m',
        depthVal: 0.72,
        risk: 'High',
        riskColor: '#EF4444',
        drainage: '88% Capacity',
        affectedRoads: 8,
        description: 'Severe inundation near Usman Road flyover and Panagal Park sumps.',
      },
      {
        id: 'nungambakkam',
        name: 'Nungambakkam High Rd',
        lat: 13.0594,
        lng: 80.2425,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.45 m',
        depthVal: 0.45,
        risk: 'Medium',
        riskColor: '#F59E0B',
        drainage: '72% Capacity',
        affectedRoads: 5,
        description: 'Main drain surcharge flowing into Cooum canal bottleneck.',
      },
      {
        id: 'velachery',
        name: 'Velachery Bypass',
        lat: 12.9815,
        lng: 80.2180,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.94 m',
        depthVal: 0.94,
        risk: 'High',
        riskColor: '#EF4444',
        drainage: '96% Capacity',
        affectedRoads: 11,
        description: 'Marshland backwater overflow into commercial corridors.',
      },
      {
        id: 'anna-nagar',
        name: 'Anna Nagar West',
        lat: 13.0850,
        lng: 80.2101,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.28 m',
        depthVal: 0.28,
        risk: 'Low',
        riskColor: '#10B981',
        drainage: '44% Capacity',
        affectedRoads: 3,
        description: 'Stormwater channels actively draining to Otteri Nullah.',
      },
      {
        id: 'guindy',
        name: 'Guindy Industrial Area',
        lat: 13.0067,
        lng: 80.2025,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.58 m',
        depthVal: 0.58,
        risk: 'Medium',
        riskColor: '#F59E0B',
        drainage: '81% Capacity',
        affectedRoads: 6,
        description: 'Adyar river high tide buffering runoff discharge.',
      },
      {
        id: 'besant-nagar',
        name: 'Besant Nagar Coastal',
        lat: 13.0002,
        lng: 80.2667,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.12 m',
        depthVal: 0.12,
        risk: 'Safe',
        riskColor: '#059669',
        drainage: '28% Capacity',
        affectedRoads: 1,
        description: 'Coastal outlet velocity optimal; minor roadside pooling.',
      },
    ],
    drainageNetwork: [
      {
        name: 'Adyar River Canal',
        status: 'High Flow',
        type: 'trunk',
        lengthKm: 42.0,
        capacityPct: 84,
        flowVelocity_ms: 2.6,
        coordinates: [
          [80.170, 13.010],
          [80.200, 13.012],
          [80.225, 13.008],
          [80.250, 13.005],
          [80.275, 13.009],
        ],
      },
      {
        name: 'Cooum River Flow',
        status: 'Moderate Surcharge',
        type: 'trunk',
        lengthKm: 28.5,
        capacityPct: 76,
        flowVelocity_ms: 1.9,
        coordinates: [
          [80.180, 13.075],
          [80.210, 13.072],
          [80.240, 13.068],
          [80.260, 13.075],
          [80.285, 13.069],
        ],
      },
      {
        name: 'Buckingham Canal Channel',
        status: 'Overflow Warning',
        type: 'tributary',
        lengthKm: 18.2,
        capacityPct: 88,
        flowVelocity_ms: 1.5,
        coordinates: [
          [80.270, 13.120],
          [80.268, 13.070],
          [80.258, 13.020],
          [80.250, 12.980],
        ],
      },
      {
        name: 'T. Nagar Sump Link',
        status: 'Surcharged',
        type: 'culvert',
        lengthKm: 4.8,
        capacityPct: 91,
        flowVelocity_ms: 1.2,
        coordinates: [
          [80.210, 13.050],
          [80.234, 13.041],
          [80.255, 13.030],
        ],
      },
      {
        name: 'Otteri Nullah Outfall',
        status: 'Active Discharge',
        type: 'outfall',
        lengthKm: 5.6,
        capacityPct: 66,
        flowVelocity_ms: 0.8,
        coordinates: [
          [80.265, 13.090],
          [80.278, 13.075],
          [80.285, 13.060],
        ],
      },
    ],
    drainageAssets: {
      tanks: 16,
      tankCapacityPct: 81,
      pumps: 12,
      activePumps: 11,
      tidalGates: 5,
      gateStatus: 'Open',
      totalLengthKm: 99.1,
      maintenanceAlerts: 2,
    },
    floodPolygons: [
      {
        depth: 0.80,
        color: '#EF4444',
        coordinates: [[
          [80.225, 13.048],
          [80.245, 13.049],
          [80.248, 13.035],
          [80.228, 13.033],
          [80.225, 13.048],
        ]],
      },
      {
        depth: 0.95,
        color: '#DC2626',
        coordinates: [[
          [80.210, 12.988],
          [80.230, 12.990],
          [80.232, 12.975],
          [80.212, 12.973],
          [80.210, 12.988],
        ]],
      },
      {
        depth: 0.45,
        color: '#F59E0B',
        coordinates: [[
          [80.235, 13.065],
          [80.252, 13.064],
          [80.250, 13.052],
          [80.232, 13.054],
          [80.235, 13.065],
        ]],
      },
    ],
  },

  bengaluru: {
    id: 'bengaluru',
    name: 'Bengaluru Urban',
    stateId: 'karnataka',
    stateName: 'Karnataka',
    lat: 12.9716,
    lng: 77.5946,
    type: 'demo',
    statusLabel: 'DEMONSTRATION DATASET',
    tag: 'VALLEY SIMULATIONS',
    risk: 'Medium',
    riskColor: '#F59E0B',
    maxDepth: '0.48 m',
    rainfall: '42 mm/hr',
    surcharge: '68%',
    affectedRoads: 18,
    confidence: '74%',
    catchments: [
      {
        id: 'bellandur',
        name: 'Bellandur Lake Catchment',
        lat: 12.9352,
        lng: 77.6775,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.48 m',
        depthVal: 0.48,
        risk: 'Medium',
        riskColor: '#F59E0B',
        drainage: '78% Capacity',
        affectedRoads: 8,
        description: 'Outlet channel siltation causing localized backup onto ORR.',
      },
      {
        id: 'silkboard',
        name: 'Silk Board Junction Underpass',
        lat: 12.9177,
        lng: 77.6238,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.55 m',
        depthVal: 0.55,
        risk: 'High',
        riskColor: '#EF4444',
        drainage: '85% Capacity',
        affectedRoads: 6,
        description: 'Depression basin receiving runoff from Madiwala overflow.',
      },
      {
        id: 'hebbal',
        name: 'Hebbal Valley Drain',
        lat: 13.0358,
        lng: 77.5970,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.22 m',
        depthVal: 0.22,
        risk: 'Low',
        riskColor: '#10B981',
        drainage: '40% Capacity',
        affectedRoads: 2,
        description: 'Primary stormwater drain flowing with adequate capacity.',
      },
    ],
    drainageNetwork: [
      {
        name: 'Koramangala-Challaghatta Valley',
        status: 'Moderate Flow',
        type: 'trunk',
        lengthKm: 14.2,
        capacityPct: 68,
        flowVelocity_ms: 1.4,
        coordinates: [
          [77.600, 12.960],
          [77.630, 12.945],
          [77.660, 12.935],
          [77.690, 12.925],
        ],
      },
      {
        name: 'Vrishabhavathi River Drain',
        status: 'Active Discharge',
        type: 'tributary',
        lengthKm: 9.8,
        capacityPct: 54,
        flowVelocity_ms: 0.9,
        coordinates: [
          [77.540, 12.980],
          [77.560, 12.965],
          [77.590, 12.958],
        ],
      },
    ],
    drainageAssets: {
      tanks: 8,
      tankCapacityPct: 62,
      pumps: 6,
      activePumps: 5,
      tidalGates: 0,
      gateStatus: 'Open',
      totalLengthKm: 24.0,
      maintenanceAlerts: 3,
    },
    floodPolygons: [
      {
        depth: 0.48,
        color: '#F59E0B',
        coordinates: [[
          [77.665, 12.940],
          [77.685, 12.942],
          [77.683, 12.930],
          [77.663, 12.932],
          [77.665, 12.940],
        ]],
      },
    ],
  },

  delhi: {
    id: 'delhi',
    name: 'Delhi Yamuna Basin',
    stateId: 'delhi',
    stateName: 'Delhi NCR',
    lat: 28.6139,
    lng: 77.2090,
    type: 'demo',
    statusLabel: 'DEMONSTRATION DATASET',
    tag: 'RIVER FLOODPLAIN',
    risk: 'Medium',
    riskColor: '#F59E0B',
    maxDepth: '0.52 m',
    rainfall: '48 mm/hr',
    surcharge: '72%',
    affectedRoads: 15,
    confidence: '76%',
    catchments: [
      {
        id: 'yamuna-floodplain',
        name: 'Yamuna Floodplain / Kashmere Gate',
        lat: 28.6667,
        lng: 77.2333,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.52 m',
        depthVal: 0.52,
        risk: 'Medium',
        riskColor: '#F59E0B',
        drainage: '79% Capacity',
        affectedRoads: 7,
        description: 'River water level at 205.33 m warning mark; embankment regulators engaged.',
      },
      {
        id: 'ito-drain',
        name: 'ITO Ring Road Drain Outfall',
        lat: 28.6289,
        lng: 77.2450,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.38 m',
        depthVal: 0.38,
        risk: 'Medium',
        riskColor: '#F59E0B',
        drainage: '65% Capacity',
        affectedRoads: 5,
        description: 'Drain No. 12 backflow pump units deployed.',
      },
      {
        id: 'minto-bridge',
        name: 'Minto Bridge Underpass',
        lat: 28.6360,
        lng: 77.2250,
        area_km2: 0, imperviousnessPct: 0, rainfall_mmhr: 0, runoffCoefficient: 0, targetNodeId: '',
        depth: '0.15 m',
        depthVal: 0.15,
        risk: 'Safe',
        riskColor: '#059669',
        drainage: '30% Capacity',
        affectedRoads: 1,
        description: 'Automated sensor cutoffs and high-capacity sumps operational.',
      },
    ],
    drainageNetwork: [
      {
        name: 'Yamuna River Corridor',
        status: 'High Water Level',
        type: 'trunk',
        lengthKm: 48.0,
        capacityPct: 79,
        flowVelocity_ms: 2.4,
        coordinates: [
          [77.230, 28.720],
          [77.240, 28.670],
          [77.250, 28.610],
          [77.280, 28.530],
        ],
      },
      {
        name: 'Najafgarh Drain Trunk',
        status: 'Active Discharge',
        type: 'trunk',
        lengthKm: 22.5,
        capacityPct: 72,
        flowVelocity_ms: 1.6,
        coordinates: [
          [77.050, 28.620],
          [77.130, 28.670],
          [77.220, 28.700],
        ],
      },
      {
        name: 'Delhi Drain No. 12',
        status: 'Moderate Surcharge',
        type: 'tributary',
        lengthKm: 11.2,
        capacityPct: 65,
        flowVelocity_ms: 1.1,
        coordinates: [
          [77.195, 28.650],
          [77.210, 28.635],
          [77.225, 28.625],
        ],
      },
    ],
    drainageAssets: {
      tanks: 10,
      tankCapacityPct: 70,
      pumps: 8,
      activePumps: 7,
      tidalGates: 2,
      gateStatus: 'Open',
      totalLengthKm: 81.7,
      maintenanceAlerts: 1,
    },
    floodPolygons: [
      {
        depth: 0.52,
        color: '#F59E0B',
        coordinates: [[
          [77.235, 28.675],
          [77.250, 28.672],
          [77.248, 28.658],
          [77.232, 28.660],
          [77.235, 28.675],
        ]],
      },
    ],
  },

  kolkata: {
    id: 'kolkata',
    name: 'Kolkata Urban Basin',
    stateId: 'westbengal',
    stateName: 'West Bengal',
    lat: 22.5726,
    lng: 88.3639,
    type: 'demo',
    statusLabel: 'DEMONSTRATION DATASET',
    tag: 'HOOGHLY TIDAL DRAINAGE',
    risk: 'Medium',
    riskColor: '#F59E0B',
    maxDepth: '0.61 m',
    rainfall: '58 mm/hr',
    surcharge: '82%',
    affectedRoads: 22,
    confidence: '72%',
    catchments: [
      {
        id: 'thanthania',
        name: 'Thanthania / College Street',
        lat: 22.5790,
        lng: 88.3650,
        depth: '0.61 m',
        depthVal: 0.61,
        risk: 'High',
        riskColor: '#EF4444',
        drainage: '86% Capacity',
        affectedRoads: 8,
        description: 'Old brick sewer overflow during lock-gate closure.',
      },
      {
        id: 'park-circus',
        name: 'Park Circus / Topsia Canal',
        lat: 22.5440,
        lng: 88.3810,
        depth: '0.44 m',
        depthVal: 0.44,
        risk: 'Medium',
        riskColor: '#F59E0B',
        drainage: '75% Capacity',
        affectedRoads: 6,
        description: 'East Kolkata wetlands gravity discharge rate slowed by tide.',
      },
    ],
    drainageNetwork: [
      {
        name: 'Circular Canal Outfall',
        status: 'Tidal Flap Gates Closed',
        type: 'outfall',
        lengthKm: 10.4,
        capacityPct: 86,
        flowVelocity_ms: 0.6,
        coordinates: [
          [88.350, 22.610],
          [88.375, 22.590],
          [88.395, 22.560],
        ],
      },
      {
        name: 'Tolly Nullah Trunk Drain',
        status: 'Surcharged',
        type: 'trunk',
        lengthKm: 16.8,
        capacityPct: 82,
        flowVelocity_ms: 1.7,
        coordinates: [
          [88.340, 22.550],
          [88.355, 22.570],
          [88.370, 22.590],
        ],
      },
    ],
    drainageAssets: {
      tanks: 12,
      tankCapacityPct: 79,
      pumps: 10,
      activePumps: 8,
      tidalGates: 9,
      gateStatus: 'Closed',
      totalLengthKm: 27.2,
      maintenanceAlerts: 5,
    },
    floodPolygons: [
      {
        depth: 0.61,
        color: '#EF4444',
        coordinates: [[
          [88.360, 22.585],
          [88.375, 22.584],
          [88.373, 22.572],
          [88.358, 22.574],
          [88.360, 22.585],
        ]],
      },
    ],
  },

  // State Level Minor/Configuring Cities
  pune: {
    id: 'pune',
    name: 'Pune Metro',
    stateId: 'maharashtra',
    stateName: 'Maharashtra',
    lat: 18.5204,
    lng: 73.8567,
    type: 'unconfigured',
    statusLabel: 'NOT CONFIGURED - COMING SOON',
    tag: 'ONBOARDING PHASE',
    risk: 'Safe',
    riskColor: '#6B7280',
    maxDepth: '0.10 m',
    rainfall: '12 mm/hr',
    surcharge: '24%',
    affectedRoads: 0,
    confidence: '45%',
    catchments: [],
    drainageNetwork: [],
    floodPolygons: [],
  },

  nagpur: {
    id: 'nagpur',
    name: 'Nagpur Central',
    stateId: 'maharashtra',
    stateName: 'Maharashtra',
    lat: 21.1458,
    lng: 79.0882,
    type: 'demo',
    statusLabel: 'DEMONSTRATION DATASET',
    tag: 'PRELIMINARY CALIBRATION',
    risk: 'Low',
    riskColor: '#10B981',
    maxDepth: '0.18 m',
    rainfall: '18 mm/hr',
    surcharge: '32%',
    affectedRoads: 2,
    confidence: '65%',
    catchments: [],
    drainageNetwork: [],
    floodPolygons: [],
  },

  nashik: {
    id: 'nashik',
    name: 'Nashik Godavari',
    stateId: 'maharashtra',
    stateName: 'Maharashtra',
    lat: 19.9975,
    lng: 73.7898,
    type: 'demo',
    statusLabel: 'DEMONSTRATION DATASET',
    tag: 'GODAVARI BASIN',
    risk: 'Low',
    riskColor: '#10B981',
    maxDepth: '0.15 m',
    rainfall: '15 mm/hr',
    surcharge: '28%',
    affectedRoads: 1,
    confidence: '62%',
    catchments: [],
    drainageNetwork: [],
    floodPolygons: [],
  },

  thane: {
    id: 'thane',
    name: 'Thane Creek Basin',
    stateId: 'maharashtra',
    stateName: 'Maharashtra',
    lat: 19.2183,
    lng: 72.9781,
    type: 'demo',
    statusLabel: 'MONITORING SENSOR GRID',
    tag: 'CREEK TIDAL SURCHARGE',
    risk: 'Medium',
    riskColor: '#F59E0B',
    maxDepth: '0.45 m',
    rainfall: '52 mm/hr',
    surcharge: '70%',
    affectedRoads: 11,
    confidence: '75%',
    catchments: [],
    drainageNetwork: [],
    floodPolygons: [],
  },

  coimbatore: {
    id: 'coimbatore',
    name: 'Coimbatore Noyyal',
    stateId: 'tamilnadu',
    stateName: 'Tamil Nadu',
    lat: 11.0168,
    lng: 76.9558,
    type: 'demo',
    statusLabel: 'DEMONSTRATION DATASET',
    tag: 'NOYYAL RIVER BASIN',
    risk: 'Low',
    riskColor: '#10B981',
    maxDepth: '0.20 m',
    rainfall: '22 mm/hr',
    surcharge: '35%',
    affectedRoads: 2,
    confidence: '64%',
    catchments: [],
    drainageNetwork: [],
    floodPolygons: [],
  },

  madurai: {
    id: 'madurai',
    name: 'Madurai Vaigai',
    stateId: 'tamilnadu',
    stateName: 'Tamil Nadu',
    lat: 9.9252,
    lng: 78.1198,
    type: 'unconfigured',
    statusLabel: 'NOT CONFIGURED - COMING SOON',
    tag: 'ONBOARDING PHASE',
    risk: 'Safe',
    riskColor: '#6B7280',
    maxDepth: '0.08 m',
    rainfall: '10 mm/hr',
    surcharge: '18%',
    affectedRoads: 0,
    confidence: '40%',
    catchments: [],
    drainageNetwork: [],
    floodPolygons: [],
  },
};

// National Highlights (Level 0 cities shown on India Overview)
export const NATIONAL_HIGHLIGHT_CITIES = ['mumbai', 'delhi', 'chennai', 'bengaluru', 'kolkata'];

// Approximate GeoJSON polygon for India boundary
export const INDIA_BOUNDARY_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'India' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [74.0, 36.5],
          [77.0, 35.5],
          [79.0, 32.5],
          [81.0, 30.5],
          [88.0, 27.5],
          [92.0, 28.0],
          [96.0, 28.5],
          [97.0, 27.5],
          [94.5, 23.5],
          [92.0, 21.0],
          [88.5, 21.5],
          [86.0, 20.0],
          [82.0, 16.0],
          [80.0, 13.0],
          [79.5, 9.5],
          [77.5, 8.0],
          [76.0, 9.5],
          [74.5, 14.5],
          [72.8, 19.0],
          [69.0, 22.5],
          [68.5, 24.5],
          [71.0, 28.0],
          [74.0, 32.5],
          [74.0, 36.5],
        ]],
      },
    },
  ],
};

// State boundary lines for progressive drill-down Level 1
export const STATE_BOUNDARIES_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // Maharashtra
    {
      type: 'Feature',
      properties: { id: 'maharashtra', name: 'Maharashtra', code: 'MH' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [72.6, 19.0],
          [72.8, 20.2],
          [74.0, 21.5],
          [76.5, 21.8],
          [79.0, 21.6],
          [80.5, 21.3],
          [80.8, 19.0],
          [78.5, 18.0],
          [76.0, 17.5],
          [74.0, 16.0],
          [73.3, 16.0],
          [72.6, 19.0],
        ]],
      },
    },
    // Tamil Nadu
    {
      type: 'Feature',
      properties: { id: 'tamilnadu', name: 'Tamil Nadu', code: 'TN' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [80.2, 13.5],
          [79.5, 13.0],
          [78.0, 12.5],
          [77.0, 12.0],
          [76.5, 10.5],
          [77.5, 8.2],
          [78.2, 9.0],
          [79.8, 10.5],
          [80.3, 13.0],
          [80.2, 13.5],
        ]],
      },
    },
    // Karnataka
    {
      type: 'Feature',
      properties: { id: 'karnataka', name: 'Karnataka', code: 'KA' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [74.5, 15.5],
          [75.5, 17.5],
          [77.5, 18.0],
          [77.5, 14.5],
          [78.0, 13.0],
          [76.5, 12.0],
          [75.0, 12.5],
          [74.2, 14.5],
          [74.5, 15.5],
        ]],
      },
    },
    // West Bengal
    {
      type: 'Feature',
      properties: { id: 'westbengal', name: 'West Bengal', code: 'WB' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [87.0, 24.5],
          [88.5, 26.5],
          [89.5, 26.0],
          [89.0, 24.0],
          [88.8, 22.0],
          [87.5, 21.8],
          [86.8, 23.0],
          [87.0, 24.5],
        ]],
      },
    },
    // Delhi NCR
    {
      type: 'Feature',
      properties: { id: 'delhi', name: 'Delhi NCR', code: 'DL' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [76.8, 28.4],
          [77.3, 28.4],
          [77.4, 28.9],
          [76.9, 28.9],
          [76.8, 28.4],
        ]],
      },
    },
  ],
};
