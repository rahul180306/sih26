// Geographic & Geospatial Intelligence Data for JalRakshak
// Supporting Progressive Geographic Drill-Down: India (Level 0) -> State (Level 1) -> City/Catchment (Level 2)

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
  catchments: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    depth: string;
    depthVal: number;
    risk: 'High' | 'Medium' | 'Low' | 'Safe';
    riskColor: string;
    drainage: string;
    affectedRoads: number;
    description: string;
  }[];
  drainageNetwork: {
    name: string;
    status: string;
    coordinates: [number, number][];
  }[];
  floodPolygons: {
    depth: number;
    color: string;
    coordinates: [number, number][][];
  }[];
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
        depth: '0.10 m',
        depthVal: 0.10,
        risk: 'Safe',
        riskColor: '#059669',
        drainage: '22% Capacity',
        affectedRoads: 1,
        description: 'Coastal sea-wall outfalls discharging smoothly into Arabian Sea.',
      },
    ],
    drainageNetwork: [
      // Mithi River Main Trunk
      {
        name: 'Mithi River Trunk Channel',
        status: 'Extreme Flow / Tide Surge',
        coordinates: [
          [72.895, 19.120],
          [72.880, 19.095],
          [72.870, 19.070],
          [72.855, 19.050],
          [72.835, 19.040],
        ],
      },
      // Vakola Nullah Tributary
      {
        name: 'Vakola Nullah Interceptor',
        status: 'Surcharged',
        coordinates: [
          [72.860, 19.085],
          [72.868, 19.070],
          [72.860, 19.055],
        ],
      },
      // Dadar / Hindmata Underground Culvert
      {
        name: 'Hindmata Storm Culvert to Mahim Creek',
        status: 'Pumped Outfall Active',
        coordinates: [
          [72.848, 19.018],
          [72.845, 19.030],
          [72.840, 19.042],
        ],
      },
      // Love Grove Outfall Line
      {
        name: 'Love Grove Pumping Sump Line',
        status: 'Active Discharge',
        coordinates: [
          [72.828, 19.005],
          [72.818, 18.995],
        ],
      },
    ],
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
        coordinates: [
          [80.210, 13.050],
          [80.234, 13.041],
          [80.255, 13.030],
        ],
      },
    ],
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
        coordinates: [
          [77.600, 12.960],
          [77.630, 12.945],
          [77.660, 12.935],
          [77.690, 12.925],
        ],
      },
    ],
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
        coordinates: [
          [77.050, 28.620],
          [77.130, 28.670],
          [77.220, 28.700],
        ],
      },
    ],
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
        coordinates: [
          [88.350, 22.610],
          [88.375, 22.590],
          [88.395, 22.560],
        ],
      },
    ],
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
