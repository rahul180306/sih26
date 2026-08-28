// Urban Flood Alerts & Early Warning Data Layer (MoES / NCMRWF JalRakshak Engine)
// Compliant with OASIS Common Alerting Protocol (CAP v1.2) & NDMA Sachet Standard

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'ADVISORY' | 'WATCH';
export type AlertStatus = 'ACTIVE' | 'MONITORING' | 'ESCALATED' | 'RESOLVED' | 'TEST';
export type AlertUrgency = 'Immediate' | 'Expected' | 'Future' | 'Past';
export type AlertCertainty = 'Observed' | 'Likely' | 'Possible' | 'Unlikely';

export interface AlertExplainability {
  rainfallIntensityPct: number;
  drainageSurchargePct: number;
  elevationDepressionPct: number;
  historicalFloodFactorPct: number;
  primaryDriver: string;
}

export interface AlertAuditEntry {
  timestamp: string;
  action: string;
  actor: string;
}

export interface FloodAlert {
  id: string;
  capIdentifier: string;
  cityId: string;
  cityName: string;
  catchmentId: string;
  hotspotName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  urgency: AlertUrgency;
  certainty: AlertCertainty;
  headline: string;
  description: string;
  instruction: string;
  predictedDepthM: number; // in meters
  predictedDepthCm: number; // in cm
  drainageSurchargePct: number; // in %
  leadTimeHours: number; // 0-3 hours
  peakTime: string;
  rainfallIntensityMmHr: number;
  affectedRoads: string[];
  vulnerablePopulationEst: number;
  lat: number;
  lng: number;
  issuedAt: string;
  expiresAt: string;
  resolvedAt?: string;
  source: string;
  dewateringPumpsActive: number;
  dewateringPumpsRequired: number;
  ndrfDispatched: boolean;
  confidencePct?: number; // prediction confidence 0-100
  explainability?: AlertExplainability;
  auditLog?: AlertAuditEntry[];
  translations: {
    en: { headline: string; instruction: string };
    hi: { headline: string; instruction: string };
    mr?: { headline: string; instruction: string };
    ta?: { headline: string; instruction: string };
    kn?: { headline: string; instruction: string };
    bn?: { headline: string; instruction: string };
  };
}

export interface EmergencyDispatchUnit {
  id: string;
  cityId: string;
  unitName: string;
  type: 'DEWATERING_PUMP' | 'NDRF_RESCUE_BOAT' | 'TRAFFIC_DIVERSION' | 'SLUICE_GATE_CREW';
  capacity: string;
  status: 'DEPLOYED' | 'EN_ROUTE' | 'STANDBY' | 'AVAILABLE' | 'OFFLINE';
  assignedHotspot: string;
  crewLeader: string;
  contactNumber: string;
  lastUpdated: string;
}

// =====================================================================
// CITY COORDINATE DEFAULTS — always used when lat/lng not explicitly set
// =====================================================================
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  mumbai:    { lat: 19.0760,  lng: 72.8777 },
  chennai:   { lat: 13.0827,  lng: 80.2707 },
  delhi:     { lat: 28.6139,  lng: 77.2090 },
  bengaluru: { lat: 12.9716,  lng: 77.5946 },
  kolkata:   { lat: 22.5726,  lng: 88.3639 },
};

// Known catchment coordinates for deep-linking
export const CATCHMENT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'hindmata':       { lat: 19.0178, lng: 72.8478 },
  'milan-subway':   { lat: 19.0838, lng: 72.8415 },
  'kurla-mithi':    { lat: 19.0688, lng: 72.8745 },
  'velachery-lake': { lat: 12.9815, lng: 80.2180 },
  't-nagar':        { lat: 13.0418, lng: 80.2341 },
  'minto-bridge':   { lat: 28.6358, lng: 77.2245 },
  'bellandur-orr':  { lat: 12.9260, lng: 77.6762 },
  'thanthania':     { lat: 22.5824, lng: 88.3654 },
};

// =====================================================================
// CITY → LANGUAGE MAPPING for broadcast simulator
// =====================================================================
export type SupportedLang = 'en' | 'hi' | 'mr' | 'ta' | 'kn' | 'bn';

export const CITY_LANGUAGES: Record<string, SupportedLang[]> = {
  all:       ['en', 'hi'],
  mumbai:    ['en', 'hi', 'mr'],
  chennai:   ['en', 'hi', 'ta'],
  delhi:     ['en', 'hi'],
  bengaluru: ['en', 'hi', 'kn'],
  kolkata:   ['en', 'hi', 'bn'],
};

export const LANGUAGE_LABELS: Record<SupportedLang, string> = {
  en: 'English',
  hi: 'हिंदी (Hindi)',
  mr: 'मराठी (Marathi)',
  ta: 'தமிழ் (Tamil)',
  kn: 'ಕನ್ನಡ (Kannada)',
  bn: 'বাংলা (Bengali)',
};

export const LANGUAGE_BCP47: Record<SupportedLang, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  bn: 'bn-IN',
};

// =====================================================================
// INITIAL FLOOD ALERTS
// =====================================================================
export const INITIAL_FLOOD_ALERTS: FloodAlert[] = [
  {
    id: 'ALT-MUM-001',
    capIdentifier: 'IN-MH-MCGM-JALRAKSHAK-20260824-001',
    cityId: 'mumbai',
    cityName: 'Mumbai Metro',
    catchmentId: 'hindmata',
    hotspotName: 'Hindmata & Dadar TT Flyover Inlets',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    urgency: 'Immediate',
    certainty: 'Observed',
    headline: 'Severe Inundation Flash Warning: Hindmata Basin Exceeding 0.85m',
    description: 'Underground holding tanks at Pramod Mahajan Park have reached 98% surcharge. Radar nowcast shows convective cloud burst cell dumping 82 mm/hr over F/North ward.',
    instruction: 'Avoid Dr. BA Road & Dadar TT underpass. Divert southbound light vehicles via Senapati Bapat Marg. High-capacity dewatering pumps (6000 m³/hr) running at maximum throttle.',
    predictedDepthM: 0.86,
    predictedDepthCm: 86,
    drainageSurchargePct: 94,
    leadTimeHours: 0.5,
    peakTime: 'Within 25 mins',
    rainfallIntensityMmHr: 82,
    affectedRoads: ['Dr Ambedkar Road', 'Dadar TT Circle', 'Madhavdas Amarshi Marg', 'Parel TT Junction'],
    vulnerablePopulationEst: 45000,
    lat: 19.0178,
    lng: 72.8478,
    issuedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 165 * 60000).toISOString(),
    source: 'MoES NCMRWF Doppler Twin + MCGM Storm Network Graph',
    dewateringPumpsActive: 6,
    dewateringPumpsRequired: 8,
    ndrfDispatched: true,
    confidencePct: 92,
    explainability: {
      rainfallIntensityPct: 92,
      drainageSurchargePct: 95,
      elevationDepressionPct: 88,
      historicalFloodFactorPct: 82,
      primaryDriver: 'Holding tank backflow + 82mm/hr convective cell over natural depression sump.',
    },
    auditLog: [
      { timestamp: new Date(Date.now() - 20 * 60000).toISOString(), action: 'Alert generated by Doppler radar nowcast engine', actor: 'JalRakshak Auto' },
      { timestamp: new Date(Date.now() - 18 * 60000).toISOString(), action: 'CAP v1.2 warning issued to NDMA Sachet', actor: 'System' },
      { timestamp: new Date(Date.now() - 15 * 60000).toISOString(), action: 'NDRF 5th Battalion dispatch authorized', actor: 'EOC Commander' },
      { timestamp: new Date(Date.now() - 12 * 60000).toISOString(), action: 'Pump DISP-01 deployed to Hindmata sump', actor: 'BMC Field Ops' },
      { timestamp: new Date(Date.now() - 8 * 60000).toISOString(), action: 'Citizen advisory broadcast dispatched (SMS + WA)', actor: 'Operator Sawant' },
    ],
    translations: {
      en: {
        headline: 'CRITICAL FLOOD WARNING: Hindmata / Dadar TT depth 86cm. Avoid Dr Ambedkar Road.',
        instruction: 'Underground culverts full. Use elevated Eastern Freeway or Senapati Bapat Marg.',
      },
      hi: {
        headline: 'अत्यंत गंभीर बाढ़ चेतावनी: हिंदमाता/दादर टीटी जलभराव 86 सेमी पार।',
        instruction: 'डॉ. बीआर अंबेडकर रोड से बचें। ईस्टर्न फ्रीवे या सेनापति बापट मार्ग का प्रयोग करें।',
      },
      mr: {
        headline: 'अतिदक्षतेचा इशारा: हिंदमाता व दादर टीटी परिसरात पाणी पातळी ८६ सेमी. रस्ता टाळा.',
        instruction: 'भूमिगत टाक्या तुडुंब. डॉ. आंबेडकर रोडऐवजी ईस्टर्न फ्रीवे किंवा सेनापती बापट मार्ग वापरा.',
      },
    },
  },
  {
    id: 'ALT-MUM-002',
    capIdentifier: 'IN-MH-MCGM-JALRAKSHAK-20260824-002',
    cityId: 'mumbai',
    cityName: 'Mumbai Metro',
    catchmentId: 'milan-subway',
    hotspotName: 'Milan Subway & SV Road Underpass',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    urgency: 'Immediate',
    certainty: 'Observed',
    headline: 'Subway Inundation Alarm: 0.92m Water Depth, Underpass Closed',
    description: 'Irla Nullah backwater flow triggered by 3.8m coastal spring tide. Stormwater gravity discharge completely stalled at outfall sluice gates.',
    instruction: 'Traffic police have barricaded both East and West subway ramps. Commuters must use Western Express Highway Flyover or Khar Subway.',
    predictedDepthM: 0.92,
    predictedDepthCm: 92,
    drainageSurchargePct: 98,
    leadTimeHours: 0.25,
    peakTime: 'Immediate',
    rainfallIntensityMmHr: 76,
    affectedRoads: ['SV Road Santacruz', 'Milan Subway Ramps', 'Nehru Road Santacruz East'],
    vulnerablePopulationEst: 28000,
    lat: 19.0838,
    lng: 72.8415,
    issuedAt: new Date(Date.now() - 32 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 148 * 60000).toISOString(),
    source: 'BMC Automated Ultrasonic Depth Gauge #MS-04 + NCMRWF Nowcast',
    dewateringPumpsActive: 4,
    dewateringPumpsRequired: 4,
    ndrfDispatched: false,
    confidencePct: 96,
    explainability: {
      rainfallIntensityPct: 88,
      drainageSurchargePct: 98,
      elevationDepressionPct: 96,
      historicalFloodFactorPct: 90,
      primaryDriver: 'Irla nullah tide lock prevents outfall gravity discharge in enclosed subway bowl.',
    },
    auditLog: [
      { timestamp: new Date(Date.now() - 35 * 60000).toISOString(), action: 'Alert generated — ultrasonic gauge #MS-04 exceeded 0.85m', actor: 'JalRakshak Auto' },
      { timestamp: new Date(Date.now() - 33 * 60000).toISOString(), action: 'Traffic Police Zone-3 notified for barricading', actor: 'EOC Dispatch' },
      { timestamp: new Date(Date.now() - 32 * 60000).toISOString(), action: 'CAP v1.2 broadcast issued', actor: 'System' },
      { timestamp: new Date(Date.now() - 28 * 60000).toISOString(), action: 'DISP-03 traffic diversion wardens deployed', actor: 'Insp. Gaikwad' },
    ],
    translations: {
      en: {
        headline: 'SUBWAY SHUTDOWN: Milan Subway submerged (92cm depth).',
        instruction: 'Underpass closed. Divert across Western Express Highway flyover.',
      },
      hi: {
        headline: 'मिलन सबवे बंद: जलस्तर 92 सेमी तक पहुंचा, आवाजाही रोकी गई।',
        instruction: 'दोनों तरफ बैरिकेडिंग। वेस्टर्न एक्सप्रेसवे फ्लाईओवर का उपयोग करें।',
      },
      mr: {
        headline: 'मिलन सबवे बंद: पाणी पातळी ९२ सेमीवर. वाहतूक पूर्णपणे रोखली.',
        instruction: 'सबवे बंद आहे. वेस्टर्न एक्सप्रेस हायवे उड्डाणपुलाचा वापर करा.',
      },
    },
  },
  {
    id: 'ALT-MUM-003',
    capIdentifier: 'IN-MH-MCGM-JALRAKSHAK-20260824-003',
    cityId: 'mumbai',
    cityName: 'Mumbai Metro',
    catchmentId: 'kurla-mithi',
    hotspotName: 'Kurla West Kranti Nagar (Mithi River Bank)',
    severity: 'WARNING',
    status: 'ACTIVE',
    urgency: 'Expected',
    certainty: 'Likely',
    headline: 'Riverbank Backflow Warning: Mithi River Level Approaching 3.6m Danger Mark',
    description: 'Vihar and Powai lake overflow discharge coupled with localized heavy precipitation upstream. Low-lying slum settlements along Kranti Nagar on alert.',
    instruction: 'NDRF 5th Battalion positioned with 4 inflatable rescue boats. Ground floor residents advised to elevate electrical equipment.',
    predictedDepthM: 0.78,
    predictedDepthCm: 78,
    drainageSurchargePct: 91,
    leadTimeHours: 1.2,
    peakTime: '+1 hr 15 mins',
    rainfallIntensityMmHr: 68,
    affectedRoads: ['LBS Marg Kurla', 'Bail Bazar Road', 'CST Road Kurla West'],
    vulnerablePopulationEst: 62000,
    lat: 19.0688,
    lng: 72.8745,
    issuedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 195 * 60000).toISOString(),
    source: 'Hydrological River Gauge Sensor RT-08 + 2D Inundation Model',
    dewateringPumpsActive: 5,
    dewateringPumpsRequired: 7,
    ndrfDispatched: true,
    confidencePct: 84,
    explainability: {
      rainfallIntensityPct: 76,
      drainageSurchargePct: 91,
      elevationDepressionPct: 82,
      historicalFloodFactorPct: 85,
      primaryDriver: 'Upstream lake overflow combined with high tide sill overtopping.',
    },
    auditLog: [
      { timestamp: new Date(Date.now() - 50 * 60000).toISOString(), action: 'River gauge RT-08 crossed 3.2m threshold', actor: 'JalRakshak Auto' },
      { timestamp: new Date(Date.now() - 47 * 60000).toISOString(), action: 'NDRF boat battalion pre-positioned', actor: 'EOC Commander' },
      { timestamp: new Date(Date.now() - 45 * 60000).toISOString(), action: 'WARNING alert published to CAP registry', actor: 'System' },
    ],
    translations: {
      en: {
        headline: 'MITHI RIVER FLOOD WATCH: Kurla West risk high as river swells.',
        instruction: 'Keep emergency supplies ready. Move to first floor if near riverbank.',
      },
      hi: {
        headline: 'मीठी नदी चेतावनी: कुर्ला पश्चिम में जलभराव की गंभीर आशंका।',
        instruction: 'क्रांति नगर के निवासी सतर्क रहें। एनडीआरएफ बोट्स तैनात।',
      },
      mr: {
        headline: 'मिठी नदी इशारा: कुर्ला पश्चिमेत नदीकाठच्या भागात पुराची शक्यता.',
        instruction: 'एनडीआरएफ पथके तैनात. सखल भागातील नागरिकांनी सुरक्षित ठिकाणी जावे.',
      },
    },
  },
  {
    id: 'ALT-CHE-001',
    capIdentifier: 'IN-TN-GCC-JALRAKSHAK-20260824-001',
    cityId: 'chennai',
    cityName: 'Chennai Metro',
    catchmentId: 'velachery-lake',
    hotspotName: 'Velachery Lake Catchment & 100 Feet Bypass Road',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    urgency: 'Immediate',
    certainty: 'Observed',
    headline: 'Severe Waterlogging Crisis: Velachery Bypass Inundation 0.81m',
    description: 'Surplus canal discharging from Velachery Lake into Pallikaranai Marshland obstructed by micro-debris. Surcharge level in micro-culverts reached 92%.',
    instruction: 'Avoid 100 Feet Bypass Road near Vijayanagar bus terminus. GCC super-sucker mobile pumps actively deploying to clear culvert grating.',
    predictedDepthM: 0.81,
    predictedDepthCm: 81,
    drainageSurchargePct: 92,
    leadTimeHours: 0.5,
    peakTime: 'Peak Ongoing',
    rainfallIntensityMmHr: 78,
    affectedRoads: ['100 Feet Bypass Road', 'Vijayanagar Junction', 'Taramani Link Road'],
    vulnerablePopulationEst: 52000,
    lat: 12.9815,
    lng: 80.2180,
    issuedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 160 * 60000).toISOString(),
    source: 'GCC Smart City Hydraulic Telemetry + Radar IMERG',
    dewateringPumpsActive: 7,
    dewateringPumpsRequired: 9,
    ndrfDispatched: true,
    confidencePct: 91,
    explainability: {
      rainfallIntensityPct: 89,
      drainageSurchargePct: 92,
      elevationDepressionPct: 86,
      historicalFloodFactorPct: 88,
      primaryDriver: 'Surplus canal outflow bottleneck into Pallikaranai marshland.',
    },
    auditLog: [
      { timestamp: new Date(Date.now() - 25 * 60000).toISOString(), action: 'GCC hydraulic telemetry surcharge alarm triggered', actor: 'JalRakshak Auto' },
      { timestamp: new Date(Date.now() - 22 * 60000).toISOString(), action: 'CAP v1.2 alert issued', actor: 'System' },
      { timestamp: new Date(Date.now() - 20 * 60000).toISOString(), action: 'GCC Super-Sucker DISP-04 deployed', actor: 'Asst. Engr. Murugan' },
      { timestamp: new Date(Date.now() - 16 * 60000).toISOString(), action: 'Citizen Tamil/English SMS broadcast dispatched', actor: 'Operator GCC' },
    ],
    translations: {
      en: {
        headline: 'CRITICAL INUNDATION: Velachery 100 Feet Rd depth 81cm.',
        instruction: 'Road blocked near Vijayanagar. Use OMR / Rajiv Gandhi Salai corridor.',
      },
      hi: {
        headline: 'चेन्नई वेलाचेरी गंभीर जलभराव: 81 सेमी पानी भरा।',
        instruction: '100 फीट बाईपास रोड बंद। ओएमआर मार्ग का उपयोग करें।',
      },
      ta: {
        headline: 'வேளச்சேரி தீவிர வெள்ள எச்சரிக்கை: 100 அடி பைபாஸ் சாலையில் 81 செ.மீ நீர் தேக்கம்.',
        instruction: 'விஜயநகர் சந்திப்பை தவிர்க்கவும். ஓ.எம்.ஆர் சாலையை பயன்படுத்தவும்.',
      },
    },
  },
  {
    id: 'ALT-CHE-002',
    capIdentifier: 'IN-TN-GCC-JALRAKSHAK-20260824-002',
    cityId: 'chennai',
    cityName: 'Chennai Metro',
    catchmentId: 't-nagar',
    hotspotName: 'T. Nagar Usman Road & Bazullah Rd Basin',
    severity: 'WARNING',
    status: 'ACTIVE',
    urgency: 'Expected',
    certainty: 'Likely',
    headline: 'Commercial Corridor Drainage Surcharge: Water Depth 0.55m',
    description: 'Mambalam Canal carrying heavy stormwater runoff from Kodambakkam basin. Surcharge spilling onto Usman Road low curb lines.',
    instruction: 'Commercial storefronts advised to deploy sandbag flood barriers. Two-wheelers redirected towards Anna Salai.',
    predictedDepthM: 0.55,
    predictedDepthCm: 55,
    drainageSurchargePct: 86,
    leadTimeHours: 1.0,
    peakTime: '+45 mins',
    rainfallIntensityMmHr: 62,
    affectedRoads: ['South Usman Road', 'Bazullah Road', 'Venkatnarayana Road'],
    vulnerablePopulationEst: 38000,
    lat: 13.0418,
    lng: 80.2341,
    issuedAt: new Date(Date.now() - 50 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 130 * 60000).toISOString(),
    source: 'Mambalam Canal Acoustic Flow Gauge #MC-02',
    dewateringPumpsActive: 4,
    dewateringPumpsRequired: 5,
    ndrfDispatched: false,
    confidencePct: 81,
    explainability: {
      rainfallIntensityPct: 72,
      drainageSurchargePct: 86,
      elevationDepressionPct: 65,
      historicalFloodFactorPct: 75,
      primaryDriver: 'Mambalam Canal capacity bottleneck overflowing onto road curbs.',
    },
    auditLog: [
      { timestamp: new Date(Date.now() - 55 * 60000).toISOString(), action: 'Canal gauge #MC-02 flow rate exceeded design capacity', actor: 'JalRakshak Auto' },
      { timestamp: new Date(Date.now() - 50 * 60000).toISOString(), action: 'WARNING alert published', actor: 'System' },
    ],
    translations: {
      en: {
        headline: 'T. NAGAR WARNING: Usman Road water depth 55cm. Commercial flood barriers advised.',
        instruction: 'Divert through Anna Salai. High capacity pumps clearing Mambalam canal.',
      },
      hi: {
        headline: 'टी. नगर चेतावनी: उस्मान रोड पर 55 सेमी जलभराव।',
        instruction: 'अन्ना सलाई होकर जाएं। माम्बलम नहर पर पंप सक्रिय हैं।',
      },
      ta: {
        headline: 'தி. நகர் வெள்ள அபாய எச்சரிக்கை: உஸ்மான் சாலையில் 55 செ.மீ நீர்.',
        instruction: 'அண்ணா சாலையை பயன்படுத்தவும். பம்புகள் மூலம் நீர் வெளியேற்றப்படுகிறது.',
      },
    },
  },
  {
    id: 'ALT-DEL-001',
    capIdentifier: 'IN-DL-MCD-JALRAKSHAK-20260824-001',
    cityId: 'delhi',
    cityName: 'Delhi NCR',
    catchmentId: 'minto-bridge',
    hotspotName: 'Minto Road Railway Underpass',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    urgency: 'Immediate',
    certainty: 'Observed',
    headline: 'Critical Sump Inundation: Minto Bridge Underpass Water Level 0.74m',
    description: 'Depression terrain sump receiving heavy unintercepted runoff from Connaught Place Outer Circle. Automated pumping station operating at 100% capacity.',
    instruction: 'Underpass closed for vehicular movement by Delhi Traffic Police. Traffic diverted via Barakhamba Road and Deen Dayal Upadhyaya Marg.',
    predictedDepthM: 0.74,
    predictedDepthCm: 74,
    drainageSurchargePct: 96,
    leadTimeHours: 0.1,
    peakTime: 'Immediate',
    rainfallIntensityMmHr: 72,
    affectedRoads: ['Minto Road', 'Swami Vivekananda Marg', 'Connaught Circus Conn. Ramps'],
    vulnerablePopulationEst: 31000,
    lat: 28.6358,
    lng: 77.2245,
    issuedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 170 * 60000).toISOString(),
    source: 'MCD Sensor Network #DL-MB-01 + NCMRWF Radar Palam',
    dewateringPumpsActive: 6,
    dewateringPumpsRequired: 6,
    ndrfDispatched: false,
    confidencePct: 94,
    explainability: {
      rainfallIntensityPct: 85,
      drainageSurchargePct: 96,
      elevationDepressionPct: 98,
      historicalFloodFactorPct: 94,
      primaryDriver: 'Depression basin collecting rapid runoff from CP Outer Circle pavements.',
    },
    auditLog: [
      { timestamp: new Date(Date.now() - 12 * 60000).toISOString(), action: 'Sump level exceeded critical threshold — auto-alert triggered', actor: 'JalRakshak Auto' },
      { timestamp: new Date(Date.now() - 10 * 60000).toISOString(), action: 'CRITICAL CAP alert published to NDMA registry', actor: 'System' },
      { timestamp: new Date(Date.now() - 8 * 60000).toISOString(), action: 'Delhi Traffic Police notified for closure', actor: 'EOC Delhi' },
    ],
    translations: {
      en: {
        headline: 'MINTO BRIDGE CLOSED: Water depth 74cm. Traffic diverted via Barakhamba.',
        instruction: 'Do not attempt to drive through underpass. High risk of vehicle stalling.',
      },
      hi: {
        headline: 'मिंटो ब्रिज बंद: जलभराव 74 सेमी तक पहुंचा। बाराखंभा रोड से डायवर्जन।',
        instruction: 'अंडरपास में वाहन न ले जाएं। यातायात पुलिस ने रास्ते बंद किए।',
      },
    },
  },
  {
    id: 'ALT-BLR-001',
    capIdentifier: 'IN-KA-BBMP-JALRAKSHAK-20260824-001',
    cityId: 'bengaluru',
    cityName: 'Bengaluru Metro',
    catchmentId: 'bellandur-orr',
    hotspotName: 'Outer Ring Road (Ecospace - Bellandur Junction)',
    severity: 'WARNING',
    status: 'ACTIVE',
    urgency: 'Expected',
    certainty: 'Likely',
    headline: 'Tech Corridor Overland Flow: 0.48m Inundation on ORR Service Lanes',
    description: 'Bellandur lake inlet storm drain choke causing stormwater overflow across service roads towards Sarjapur signal.',
    instruction: 'Commuters advised to use main carriageway flyovers or postpone travel during evening rush hour.',
    predictedDepthM: 0.48,
    predictedDepthCm: 48,
    drainageSurchargePct: 84,
    leadTimeHours: 0.8,
    peakTime: '+40 mins',
    rainfallIntensityMmHr: 58,
    affectedRoads: ['Outer Ring Road Service Lane', 'Sarjapur Main Road', 'Kariyammana Agrahara Rd'],
    vulnerablePopulationEst: 42000,
    lat: 12.9260,
    lng: 77.6762,
    issuedAt: new Date(Date.now() - 40 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 140 * 60000).toISOString(),
    source: 'BBMP Rain Gauge & Hydro Inflow Sensor #BLR-BEL-09',
    dewateringPumpsActive: 3,
    dewateringPumpsRequired: 5,
    ndrfDispatched: false,
    confidencePct: 78,
    explainability: {
      rainfallIntensityPct: 68,
      drainageSurchargePct: 84,
      elevationDepressionPct: 70,
      historicalFloodFactorPct: 74,
      primaryDriver: 'Stormwater culvert inlet choking upstream of Bellandur lake basin.',
    },
    auditLog: [
      { timestamp: new Date(Date.now() - 42 * 60000).toISOString(), action: 'Bellandur inlet sensor inflow rate alarm', actor: 'JalRakshak Auto' },
      { timestamp: new Date(Date.now() - 40 * 60000).toISOString(), action: 'WARNING published to BBMP control room', actor: 'System' },
    ],
    translations: {
      en: {
        headline: 'ORR BELLANDUR ALERT: Service roads waterlogged (48cm). Expect traffic slowdowns.',
        instruction: 'Use main elevated lanes. Heavy dewatering operations underway.',
      },
      hi: {
        headline: 'बेंगलुरु आउटर रिंग रोड चेतावनी: बेलंदूर के पास 48 सेमी जलभराव।',
        instruction: 'फ्लाईओवर लेन का प्रयोग करें। सर्विस रोड पर धीमी गति से चलें।',
      },
      kn: {
        headline: 'ಬೆಂಗಳೂರು ಒಆರ್‌ಆರ್ ಎಚ್ಚರಿಕೆ: ಬೆಳ್ಳಂದೂರು ಬಳಿ ರಸ್ತೆಯಲ್ಲಿ 48 ಸೆಂ.ಮೀ ನೀರು.',
        instruction: 'ಮೇಲ್ಸೇತುವೆ ಬಳಸಿ. ಸರ್ವಿಸ್ ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಂತಿದೆ.',
      },
    },
  },
  {
    id: 'ALT-KOL-001',
    capIdentifier: 'IN-WB-KMC-JALRAKSHAK-20260824-001',
    cityId: 'kolkata',
    cityName: 'Kolkata Metro',
    catchmentId: 'thanthania',
    hotspotName: 'Thanthania Kalibari & College Street Basin',
    severity: 'ADVISORY',
    status: 'MONITORING',
    urgency: 'Expected',
    certainty: 'Possible',
    headline: 'Precautionary Advisory: College Street Surface Ponding Risk (0.34m)',
    description: 'High tide in Hooghly River has locked lock-gates at Palmer Bridge Pumping Station. Moderate showers may cause 2-hour water detention.',
    instruction: 'Tram services temporarily suspended along College Street. Pedestrians advised to step clear of open roadside drains.',
    predictedDepthM: 0.34,
    predictedDepthCm: 34,
    drainageSurchargePct: 78,
    leadTimeHours: 1.5,
    peakTime: '+1 hr 30 mins',
    rainfallIntensityMmHr: 44,
    affectedRoads: ['College Street', 'Bidhan Sarani', 'MG Road Crossing'],
    vulnerablePopulationEst: 26000,
    lat: 22.5824,
    lng: 88.3654,
    issuedAt: new Date(Date.now() - 60 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 180 * 60000).toISOString(),
    source: 'KMC Drainage Control Room + Hooghly Tide Gauge',
    dewateringPumpsActive: 4,
    dewateringPumpsRequired: 4,
    ndrfDispatched: false,
    confidencePct: 69,
    explainability: {
      rainfallIntensityPct: 52,
      drainageSurchargePct: 78,
      elevationDepressionPct: 62,
      historicalFloodFactorPct: 70,
      primaryDriver: 'Hooghly River high tide lock preventing gravity canal drainage.',
    },
    auditLog: [
      { timestamp: new Date(Date.now() - 65 * 60000).toISOString(), action: 'Tidal gate lock-out advisory issued by KMC', actor: 'JalRakshak Auto' },
      { timestamp: new Date(Date.now() - 60 * 60000).toISOString(), action: 'ADVISORY alert published', actor: 'System' },
    ],
    translations: {
      en: {
        headline: 'KOLKATA ADVISORY: College Street waterlogging expected due to lock-gate closure.',
        instruction: 'Trams paused. Heavy pumps draining towards Circular Canal.',
      },
      hi: {
        headline: 'कोलकाता परामर्श: कॉलेज स्ट्रीट पर जलभराव की संभावना (34 सेमी)।',
        instruction: 'हुगली नदी में उच्च ज्वार के कारण जल निकासी धीमी है।',
      },
      bn: {
        headline: 'কলকাতা সতর্কতা: ঠনঠনিয়া ও কলেজ স্ট্রিটে জল জমার আশঙ্কা (৩৪ সেমি)।',
        instruction: 'ট্রাম চলাচল স্থগিত। পাম্পের মাধ্যমে জল নিকাশী চলছে।',
      },
    },
  },
];

export const EMERGENCY_DISPATCH_UNITS: EmergencyDispatchUnit[] = [
  {
    id: 'DISP-01',
    cityId: 'mumbai',
    unitName: 'BMC Mobile Heavy Sump Unit Alpha-1',
    type: 'DEWATERING_PUMP',
    capacity: '6,000 m³/hr (100 HP Diesel)',
    status: 'DEPLOYED',
    assignedHotspot: 'Hindmata Dadar Flyover Sump',
    crewLeader: 'Engr. Rajesh Sawant',
    contactNumber: '+91 98201 44521',
    lastUpdated: '10 mins ago',
  },
  {
    id: 'DISP-02',
    cityId: 'mumbai',
    unitName: 'NDRF 5th Battalion Rescue Team Bravo',
    type: 'NDRF_RESCUE_BOAT',
    capacity: '4 Inflatable IRBs + 24 Rescue Divers',
    status: 'DEPLOYED',
    assignedHotspot: 'Kurla West (Mithi River Bank)',
    crewLeader: 'Inspector Amit Verma',
    contactNumber: '+91 94120 77890',
    lastUpdated: '14 mins ago',
  },
  {
    id: 'DISP-03',
    cityId: 'mumbai',
    unitName: 'Mumbai Traffic Police Zone-3 Rapid Diversion',
    type: 'TRAFFIC_DIVERSION',
    capacity: '18 Wardens + Automated Barricades',
    status: 'DEPLOYED',
    assignedHotspot: 'Milan Subway & SV Road Underpass',
    crewLeader: 'Inspector S. Gaikwad',
    contactNumber: '+91 98690 11234',
    lastUpdated: '2 mins ago',
  },
  {
    id: 'DISP-04',
    cityId: 'chennai',
    unitName: 'GCC Super-Sucker Hydro-Vacuum Unit Delta',
    type: 'DEWATERING_PUMP',
    capacity: '8,500 m³/hr Continuous Sludge Sump',
    status: 'DEPLOYED',
    assignedHotspot: 'Velachery 100 Feet Bypass Road',
    crewLeader: 'Asst. Engr. K. Murugan',
    contactNumber: '+91 94440 33219',
    lastUpdated: '5 mins ago',
  },
  {
    id: 'DISP-05',
    cityId: 'delhi',
    unitName: 'MCD Heavy Submersible Station Unit 3',
    type: 'DEWATERING_PUMP',
    capacity: '4,500 m³/hr Dual Stage Pump',
    status: 'EN_ROUTE',
    assignedHotspot: 'Minto Road Railway Underpass',
    crewLeader: 'Superintendent V. Sharma',
    contactNumber: '+91 98110 54321',
    lastUpdated: '8 mins ago',
  },
  {
    id: 'DISP-06',
    cityId: 'bengaluru',
    unitName: 'BBMP Storm Drain Response Team Echo',
    type: 'SLUICE_GATE_CREW',
    capacity: 'Heavy De-trashing Crane + 12 Crew',
    status: 'STANDBY',
    assignedHotspot: 'Bellandur Lake Inlet Weir',
    crewLeader: 'Supervisor M. Gowda',
    contactNumber: '+91 98450 67123',
    lastUpdated: '25 mins ago',
  },
  {
    id: 'DISP-07',
    cityId: 'kolkata',
    unitName: 'KMC Palmer Bridge Sluice Control Unit',
    type: 'SLUICE_GATE_CREW',
    capacity: 'Tidal Lock Sluice Control Hub',
    status: 'AVAILABLE',
    assignedHotspot: 'Palmer Bridge Outfall Gate',
    crewLeader: 'Chief Operator S. Banerjee',
    contactNumber: '+91 98300 99881',
    lastUpdated: '30 mins ago',
  },
  {
    id: 'DISP-08',
    cityId: 'mumbai',
    unitName: 'Dharavi Slum Quick Response Sump Team',
    type: 'DEWATERING_PUMP',
    capacity: '3,000 m³/hr Portable Pump',
    status: 'OFFLINE',
    assignedHotspot: 'Dharavi T-Junction Sump (Routine Service)',
    crewLeader: 'Operator P. Mane',
    contactNumber: '+91 98211 55670',
    lastUpdated: '1 hour ago',
  },
];

// =====================================================================
// Common Alerting Protocol (CAP v1.2) OASIS standard generator
// =====================================================================
export function generateCapXml(alert: FloodAlert): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${alert.capIdentifier}</identifier>
  <sender>jalrakshak.ncmrwf@gov.in</sender>
  <sent>${alert.issuedAt}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <code>MOES-NCMRWF-URBAN-FLOOD-V2.1</code>
  <info>
    <category>Met</category>
    <event>Urban Flash Flood / Drainage Surcharge Inundation</event>
    <urgency>${alert.urgency}</urgency>
    <severity>${alert.severity === 'CRITICAL' ? 'Extreme' : alert.severity === 'WARNING' ? 'Severe' : 'Moderate'}</severity>
    <certainty>${alert.certainty}</certainty>
    <eventCode>
      <valueName>SAME</valueName>
      <value>FFW</value>
    </eventCode>
    <expires>${alert.expiresAt}</expires>
    <senderName>MoES / NCMRWF JalRakshak National Flood Nowcasting Center</senderName>
    <headline>${escapeXml(alert.headline)}</headline>
    <description>${escapeXml(alert.description)}</description>
    <instruction>${escapeXml(alert.instruction)}</instruction>
    <parameter>
      <valueName>PredictedWaterDepthMeters</valueName>
      <value>${alert.predictedDepthM.toFixed(2)}</value>
    </parameter>
    <parameter>
      <valueName>DrainageSurchargePercentage</valueName>
      <value>${alert.drainageSurchargePct}%</value>
    </parameter>
    <parameter>
      <valueName>RainfallIntensityMmHr</valueName>
      <value>${alert.rainfallIntensityMmHr}</value>
    </parameter>
    <parameter>
      <valueName>LeadTimeHours</valueName>
      <value>${alert.leadTimeHours}</value>
    </parameter>
    ${alert.confidencePct !== undefined ? `<parameter>
      <valueName>PredictionConfidencePct</valueName>
      <value>${alert.confidencePct}%</value>
    </parameter>` : ''}
    <area>
      <areaDesc>${escapeXml(alert.hotspotName)}, ${escapeXml(alert.cityName)}</areaDesc>
      <circle>${alert.lat},${alert.lng},1.5</circle>
    </area>
  </info>
</alert>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
