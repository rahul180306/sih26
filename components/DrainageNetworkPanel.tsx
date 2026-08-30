'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Plus,
  Minus,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Waves,
  Navigation,
  Sliders,
  CheckCircle,
  Activity,
  Layers,
  RotateCcw,
  Sparkles,
  Zap,
  TrendingDown,
  Gauge,
  Loader2,
  Filter,
  Eye,
  Droplets,
  ShieldAlert,
  MapPin,
  Bell,
  ArrowUpRight,
  Radio,
  Share2,
  Compass,
  Building2,
  Clock,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Palette,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import type { DeploymentCity } from '@/lib/geoData';
import {
  ReservoirTelemetry,
  getReservoirsForCity,
  getAllReservoirs,
  getCriticalReservoirAlerts
} from '@/lib/reservoirData';

interface DrainageNetworkPanelProps {
  cityData?: DeploymentCity;
}

// ─── Color Palette Matching Neer Vazhvu Spec ─────────────────────────────────
const DRAIN_COLORS: Record<string, string> = {
  macro: '#EF4444',      // Red - Macro Drain (Trunk)
  micro: '#EA580C',      // Orange - Micro Drain (Nullah)
  swd: '#00B4D8',        // Sky Blue - Storm Water Drain
  side: '#A855F7',       // Purple - Side / Road-edge Drain
  open: '#F59E0B',       // Amber / Golden - Open Drain
  river: '#06B6D4',      // Teal / Cyan - River Course
  sewer: '#EC4899',      // Pink - Sewerage Trunk
};

const HAZARD_COLORS: Record<string, string> = {
  very_high: '#EF4444', // Red (>0.60m)
  high: '#F97316',      // Orange (0.30 - 0.60m)
  moderate: '#EAB308',  // Yellow (0.15 - 0.30m)
  low: '#10B981',       // Green (<0.15m)
  very_low: '#3B82F6',  // Blue (Safe / Elevated)
};

type ActiveSubTab = 'hazard' | 'history' | 'drainage' | 'sewerage' | 'reservoirs';
type BasemapType = 'dark_labels' | 'osm_standard' | 'satellite';

const SUPPORTED_CITIES = [
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', stateCode: 'TN', center: [80.1800, 13.0400] as [number, number], zoom: 12 },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', stateCode: 'MH', center: [72.8777, 19.0760] as [number, number], zoom: 12 },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', stateCode: 'KA', center: [77.5946, 12.9716] as [number, number], zoom: 12 },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', stateCode: 'TG', center: [78.4867, 17.3850] as [number, number], zoom: 12 },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', stateCode: 'MH', center: [73.8567, 18.5204] as [number, number], zoom: 12 },
];

const CITY_DEFAULT_STATS: Record<string, { swdCount: number; sideDrainCount: number; macroMicroCount: number; totalLengthKm: number; criticalCount: number }> = {
  chennai: { swdCount: 8092, sideDrainCount: 2089, macroMicroCount: 52, totalLengthKm: 1420.6, criticalCount: 14 },
  mumbai: { swdCount: 6840, sideDrainCount: 1940, macroMicroCount: 48, totalLengthKm: 1280.4, criticalCount: 18 },
  bengaluru: { swdCount: 7420, sideDrainCount: 2310, macroMicroCount: 64, totalLengthKm: 1390.8, criticalCount: 16 },
  hyderabad: { swdCount: 6150, sideDrainCount: 1820, macroMicroCount: 42, totalLengthKm: 1145.2, criticalCount: 12 },
  pune: { swdCount: 5890, sideDrainCount: 1650, macroMicroCount: 38, totalLengthKm: 1085.5, criticalCount: 11 },
};

export const DrainageNetworkPanel: React.FC<DrainageNetworkPanelProps> = ({ cityData }) => {
  // ─── City Selection State ───────────────────────────────────────────────────
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    if (cityData?.id && SUPPORTED_CITIES.some(c => c.id === cityData.id)) {
      return cityData.id;
    }
    return 'chennai';
  });

  const currentCityConfig = useMemo(() => {
    return SUPPORTED_CITIES.find(c => c.id === selectedCity) || SUPPORTED_CITIES[0];
  }, [selectedCity]);

  // ─── Navigation Tabs & Basemaps ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveSubTab>('drainage');
  const [basemap, setBasemap] = useState<BasemapType>('dark_labels');
  const [isElevationActive, setIsElevationActive] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isLineInfoModalOpen, setIsLineInfoModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isSimDrawerOpen, setIsSimDrawerOpen] = useState(false);
  const [isIntimationModalOpen, setIsIntimationModalOpen] = useState(false);
  const [intimationSuccess, setIntimationSuccess] = useState(false);

  // ─── Selected Reservoir or Asset State ──────────────────────────────────────
  const [selectedReservoir, setSelectedReservoir] = useState<ReservoirTelemetry | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<{
    id: string;
    name: string;
    type: string;
    street?: string;
    location?: string;
    ward?: string;
    zone?: string;
    depth?: number;
    width?: number;
    length?: number;
    status?: string;
    cover?: string;
    material?: string;
    flow_m3s?: number;
    utilization?: number;
    waterDepth_m?: number;
    riskScore?: number;
    coordinates?: [number, number][];
  } | null>(null);

  // ─── Simulation Parameters ─────────────────────────────────────────────────
  const [simRainfall, setSimRainfall] = useState<number>(75);
  const [simBlockage, setSimBlockage] = useState<number>(30);
  const [simTide, setSimTide] = useState<number>(2.4);

  // ─── Emergency Route State ────────────────────────────────────────────────
  const [isRouterActive, setIsRouterActive] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState('Urban SWD Inflow Node');
  const [routeDest, setRouteDest] = useState('River Outfall Base');
  const [routeVehicle, setRouteVehicle] = useState('EMERGENCY_AMBULANCE');
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<any>(null);

  // ─── Map References & State ────────────────────────────────────────────────
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any | null>(null);          // Leaflet Map instance
  const tileLayersRef = useRef<{ base?: any; ref?: any; satellite?: any; osm?: any }>({});
  const drainageLayerRef = useRef<any | null>(null);        // Leaflet GeoJSON layer
  const riverLayerRef = useRef<any | null>(null);
  const floodLayerRef = useRef<any | null>(null);           // Hazard Zones Polygons
  const historyLayerRef = useRef<any | null>(null);         // Historical Floods Hotspots
  const sewerLayerRef = useRef<any | null>(null);
  const reservoirLayerGroupRef = useRef<any | null>(null);  // Leaflet LayerGroup for Reservoirs
  const [isMapReady, setIsMapReady] = useState(false);

  // ─── Dynamic Counts State ──────────────────────────────────────────────────
  const [drainageStats, setDrainageStats] = useState(() => {
    return CITY_DEFAULT_STATS[selectedCity] || CITY_DEFAULT_STATS.chennai;
  });

  // ─── Active City Reservoirs ────────────────────────────────────────────────
  const cityReservoirs = useMemo(() => {
    return getReservoirsForCity(selectedCity);
  }, [selectedCity]);

  // Find critical reservoir (>90% full or discharging) for banner
  const criticalReservoir = useMemo(() => {
    return cityReservoirs.find(r => r.capacityPct >= 90 || r.status === 'CRITICAL_FULL' || r.status === 'OVERFLOWING' || r.status === 'DISCHARGING') || cityReservoirs[0];
  }, [cityReservoirs]);

  // ─── City Center Coordinates ───────────────────────────────────────────────
  const cityCoordinates = useMemo<[number, number]>(() => {
    return currentCityConfig.center;
  }, [currentCityConfig]);

  // ─── Switch Basemap Function ───────────────────────────────────────────────
  const applyBasemap = useCallback((type: BasemapType, map: any, L: any) => {
    // Remove existing tile layers
    Object.values(tileLayersRef.current).forEach(layer => {
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    if (type === 'dark_labels') {
      const base = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Leaflet | © Esri, HERE, Garmin, OpenStreetMap contributors',
          maxZoom: 19,
        }
      ).addTo(map);

      const ref = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          zIndex: 10,
        }
      ).addTo(map);

      tileLayersRef.current = { base, ref };
    } else if (type === 'osm_standard') {
      const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: 'Leaflet | © OpenStreetMap contributors',
          maxZoom: 19,
        }
      ).addTo(map);
      tileLayersRef.current = { osm };
    } else if (type === 'satellite') {
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Leaflet | © Esri, DigitalGlobe, GeoEye, Earthstar',
          maxZoom: 19,
        }
      ).addTo(map);

      const ref = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          zIndex: 10,
        }
      ).addTo(map);

      tileLayersRef.current = { satellite, ref };
    }
  }, []);

  // ─── Handle Map Initialization (Leaflet) ────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isMounted = true;
    setIsMapReady(false);

    (async () => {
      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;

      // Remove existing map if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // ── Create Leaflet map ──
      const map = L.map(mapContainerRef.current, {
        center: [cityCoordinates[1], cityCoordinates[0]],
        zoom: currentCityConfig.zoom,
        zoomControl: false,
        attributionControl: true,
      });

      mapInstanceRef.current = map;

      // Apply initial basemap
      applyBasemap(basemap, map, L);

      // ── Helper: get color for a feature ──────────────────────────────────────
      const getColor = (p: any): string => {
        const rawType = (p?.drain_type || p?.type || '').toLowerCase();
        if (rawType.includes('macro') || rawType.includes('trunk')) return DRAIN_COLORS.macro;
        if (rawType.includes('micro') || rawType.includes('nullah')) return DRAIN_COLORS.micro;
        if (rawType.includes('side')) return DRAIN_COLORS.side;
        if (rawType.includes('open') || p?.detail === 'Open') return DRAIN_COLORS.open;
        return DRAIN_COLORS.swd;
      };

      // ── Helper: get category name ─────────────────────────────────────────────
      const getCategory = (p: any): string => {
        const rawType = (p?.drain_type || p?.type || '').toLowerCase();
        if (rawType.includes('macro') || rawType.includes('trunk')) return 'macro';
        if (rawType.includes('micro') || rawType.includes('nullah')) return 'micro';
        if (rawType.includes('side')) return 'side';
        if (rawType.includes('open') || p?.detail === 'Open') return 'open';
        return 'swd';
      };

      // ── 1. Load Drainage GeoJSON for Selected City ────────────────────────────
      try {
        const drainageUrl = selectedCity === 'chennai'
          ? '/data/neer-vazhvu/chennai/chennai-drainage.geojson'
          : selectedCity === 'mumbai'
          ? '/data/neer-vazhvu/mumbai/mumbai-drainage.geojson'
          : selectedCity === 'bengaluru'
          ? '/data/neer-vazhvu/bengaluru/bangalore-swd-primary.geojson'
          : selectedCity === 'hyderabad'
          ? '/data/neer-vazhvu/hyderabad/hyderabad-drainage.geojson'
          : '/data/neer-vazhvu/pune/pune-drainage.geojson';

        const res = await fetch(drainageUrl);
        if (res.ok && isMounted) {
          const geojson = await res.json();

          let swd = 0, side = 0, macro = 0;

          const drainLayer = L.geoJSON(geojson, {
            style: (feature) => {
              const p = feature?.properties || {};
              const cat = getCategory(p);
              const color = getColor(p);
              const isMacro = cat === 'macro';
              if (cat === 'macro') macro++;
              else if (cat === 'side') side++;
              else swd++;
              return {
                color,
                weight: isMacro ? 3.8 : 2.2,
                opacity: 0.95,
                smoothFactor: 1,
              };
            },
            onEachFeature: (feature, layer) => {
              const p = feature.properties || {};
              const cat = getCategory(p);
              const color = getColor(p);
              const util = p.status === 'Bad' ? 92 : 45;
              const drainName = p.street || p.name || 'Storm Drainage Conduit';

              // Instant Area/City Tooltip on touch or hover
              layer.bindTooltip(`
                <div style="background:#0D1321;border:1px solid rgba(0,180,216,0.6);border-radius:8px;padding:4px 8px;color:#FFF;font-family:sans-serif;font-weight:800;font-size:11px;box-shadow:0 6px 18px rgba(0,0,0,0.85);white-space:nowrap;display:flex;align-items:center;gap:5px;">
                  <span style="color:${color};font-size:12px;">💧</span>
                  <span style="color:#FFF;">${drainName}</span>
                  <span style="color:#94a3b8;font-size:10px;font-weight:600;">· ${currentCityConfig.name}</span>
                </div>
              `, { direction: 'top', sticky: true, opacity: 0.98 });

              layer.on('click', (e: any) => {
                setSelectedReservoir(null);
                const updatedAsset = {
                  id: p.id || `${currentCityConfig.stateCode}-SWD`,
                  name: drainName,
                  type: `${cat.toUpperCase()} CONDUIT`,
                  street: p.street || p.name || 'Arterial Storm Conduit',
                  location: `${currentCityConfig.name} Hydrodynamic Basin, ${currentCityConfig.state}`,
                  ward: p.ward || 'Municipal Ward',
                  zone: p.zone || 'Urban Zone',
                  depth: Number(p.drain_dep) || 0.8,
                  width: Number(p.drain_wid) || 0.8,
                  length: Number(p.drain_len) || 350,
                  status: p.status || 'Good',
                  cover: p.cover || 'Covered Slab',
                  material: p.material || 'Reinforced Concrete (RCC)',
                  flow_m3s: (Number(p.drain_wid) || 0.8) * (Number(p.drain_dep) || 0.8) * 1.8,
                  utilization: util,
                  waterDepth_m: (Number(p.drain_dep) || 0.8) * (util / 100),
                  riskScore: p.status === 'Bad' ? 78 : 34,
                };
                setSelectedAsset(updatedAsset);

                L.popup()
                  .setLatLng(e.latlng)
                  .setContent(`
                    <div style="background:#0D1321;border:1px solid rgba(255,255,255,0.25);border-radius:12px;padding:12px;min-width:220px;font-family:sans-serif;color:#FFF;">
                      <div style="font-size:9px;color:${color};font-weight:900;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">
                        ${cat.toUpperCase()} CONDUIT · ${p.status || 'ACTIVE'}
                      </div>
                      <div style="font-size:13px;font-weight:800;margin-bottom:2px;">${drainName}</div>
                      <div style="font-size:10px;color:#94a3b8;margin-bottom:8px;">${currentCityConfig.name}, ${currentCityConfig.state}</div>
                      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;">
                        <div style="background:rgba(255,255,255,0.06);padding:6px;border-radius:8px;text-align:center;">
                          <div style="color:#94a3b8;font-size:8px;">HYDRAULIC LOAD</div>
                          <div style="color:${util >= 85 ? '#FF3333' : '#38BDF8'};font-weight:800;font-size:13px;">${util}%</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.06);padding:6px;border-radius:8px;text-align:center;">
                          <div style="color:#94a3b8;font-size:8px;">WIDTH</div>
                          <div style="color:#10B981;font-weight:800;font-size:13px;">${(Number(p.drain_wid) || 0.8).toFixed(1)} m</div>
                        </div>
                      </div>
                    </div>
                  `)
                  .openOn(map);
              });
              layer.on('mouseover', function(this: any) {
                this.setStyle({ weight: 5.5, opacity: 1 });
              });
              layer.on('mouseout', function(this: any) {
                drainLayer.resetStyle(this);
              });
            },
          }).addTo(map);

          drainageLayerRef.current = drainLayer;

          let swdC = 0, sideC = 0, macroC = 0;
          (geojson.features || []).forEach((f: any) => {
            const cat = getCategory(f.properties || {});
            if (cat === 'macro' || cat === 'micro') macroC++;
            else if (cat === 'side') sideC++;
            else swdC++;
          });

          const baseStat = CITY_DEFAULT_STATS[selectedCity] || CITY_DEFAULT_STATS.chennai;
          setDrainageStats({
            swdCount: swdC > 0 ? swdC * 120 : baseStat.swdCount,
            sideDrainCount: sideC > 0 ? sideC * 85 : baseStat.sideDrainCount,
            macroMicroCount: macroC > 0 ? macroC : baseStat.macroMicroCount,
            totalLengthKm: baseStat.totalLengthKm,
            criticalCount: baseStat.criticalCount,
          });

          try { map.fitBounds(drainLayer.getBounds(), { padding: [40, 40], maxZoom: 13 }); } catch {}
        }
      } catch (err) {
        console.error('Failed to load drainage GeoJSON:', err);
      }

      // ── 2. Load Rivers GeoJSON for Selected City ──────────────────────────────
      try {
        const riversUrl = selectedCity === 'chennai'
          ? '/data/neer-vazhvu/chennai/chennai-rivers.geojson'
          : selectedCity === 'mumbai'
          ? '/data/neer-vazhvu/mumbai/mumbai-rivers.geojson'
          : selectedCity === 'bengaluru'
          ? '/data/neer-vazhvu/bengaluru/bangalore-rivers.geojson'
          : selectedCity === 'hyderabad'
          ? '/data/neer-vazhvu/hyderabad/hyderabad-rivers.geojson'
          : '/data/neer-vazhvu/pune/pune-rivers.geojson';

        const riverRes = await fetch(riversUrl);
        if (riverRes.ok && isMounted) {
          const riverJson = await riverRes.json();
          riverLayerRef.current = L.geoJSON(riverJson, {
            style: { color: DRAIN_COLORS.river, weight: 4.8, opacity: 0.95 },
            onEachFeature: (feature, layer) => {
              const p = feature.properties || {};
              const riverName = p.name || 'River Corridor';
              layer.bindTooltip(`
                <div style="background:#0D1321;border:1px solid rgba(6,182,212,0.6);border-radius:8px;padding:4px 8px;color:#FFF;font-family:sans-serif;font-weight:800;font-size:11px;box-shadow:0 6px 18px rgba(0,0,0,0.85);white-space:nowrap;display:flex;align-items:center;gap:5px;">
                  <span style="color:#06B6D4;font-size:12px;">🌊</span>
                  <span style="color:#FFF;">${riverName}</span>
                  <span style="color:#94a3b8;font-size:10px;font-weight:600;">· ${currentCityConfig.name}</span>
                </div>
              `, { direction: 'top', sticky: true });
            }
          }).addTo(map);
        }
      } catch { /* Rivers optional */ }

      // ── 3. Load Flood Hazard Zones (Polygons) for Selected City ───────────────
      try {
        const floodUrl = selectedCity === 'chennai'
          ? '/data/neer-vazhvu/chennai/chennai-flood-hazard-zones.geojson'
          : selectedCity === 'mumbai'
          ? '/data/neer-vazhvu/mumbai/mumbai-flood-hazard-zones.geojson'
          : selectedCity === 'bengaluru'
          ? '/data/neer-vazhvu/bengaluru/bangalore-flood-hazard-zones.geojson'
          : selectedCity === 'hyderabad'
          ? '/data/neer-vazhvu/hyderabad/hyderabad-flood-hazard-zones.geojson'
          : '/data/neer-vazhvu/pune/pune-flood-hazard-zones.geojson';

        const floodRes = await fetch(floodUrl);
        if (floodRes.ok && isMounted) {
          const floodJson = await floodRes.json();
          floodLayerRef.current = L.geoJSON(floodJson, {
            style: (feature) => {
              const cat = feature?.properties?.category || '';
              const fillColor = cat === 'very_high' ? HAZARD_COLORS.very_high
                : cat === 'high' ? HAZARD_COLORS.high
                : cat === 'moderate' ? HAZARD_COLORS.moderate
                : cat === 'low' ? HAZARD_COLORS.low
                : HAZARD_COLORS.very_low;
              return { fillColor, color: '#FFFFFF', weight: 1.2, fillOpacity: 0.55, opacity: 0.85 };
            },
            onEachFeature: (feature, layer) => {
              const p = feature.properties || {};
              const cat = p.category || 'Hazard Zone';
              const name = p.name || 'Flood Vulnerability Basin';
              const depth = p.depth_m ? `${p.depth_m} m` : '> 0.5 m';
              const risk = p.risk || (cat === 'very_high' ? 'Very High' : 'High');

              // Instant Area/City Tooltip on touch or hover
              layer.bindTooltip(`
                <div style="background:#0D1321;border:1px solid rgba(249,115,22,0.6);border-radius:8px;padding:4px 8px;color:#FFF;font-family:sans-serif;font-weight:800;font-size:11px;box-shadow:0 6px 18px rgba(0,0,0,0.85);white-space:nowrap;display:flex;align-items:center;gap:5px;">
                  <span style="color:#F97316;font-size:12px;">⚠️</span>
                  <span style="color:#FFF;">${name}</span>
                  <span style="color:#94a3b8;font-size:10px;font-weight:600;">· ${currentCityConfig.name}</span>
                </div>
              `, { direction: 'top', sticky: true, opacity: 0.98 });

              layer.on('click', () => {
                setSelectedReservoir(null);
                setSelectedAsset({
                  id: p.name || `${currentCityConfig.stateCode}-HAZARD`,
                  name: name,
                  type: 'FLOOD HAZARD ZONE (HYDRODYNAMIC)',
                  street: name,
                  location: `${currentCityConfig.name} Hydrodynamic Basin, ${currentCityConfig.state}`,
                  ward: 'Municipal Hazard Sector',
                  zone: `${risk} Risk Zone`,
                  depth: Number(p.depth_m || 0.65),
                  width: 120,
                  length: 450,
                  status: `${risk} Inundation Risk`,
                  material: 'Surface Depression & Drainage Choke',
                  flow_m3s: 3.2,
                  utilization: cat === 'very_high' ? 95 : 75,
                  waterDepth_m: Number(p.depth_m || 0.65),
                  riskScore: cat === 'very_high' ? 94 : 78,
                });
              });

              layer.bindPopup(`
                <div style="background:#0D1321;border:1px solid rgba(255,255,255,0.25);border-radius:12px;padding:12px;min-width:200px;color:#FFF;font-family:sans-serif;">
                  <div style="font-size:9px;color:#EF4444;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">HYDRODYNAMIC HAZARD ZONE</div>
                  <div style="font-size:13px;font-weight:800;margin-bottom:4px;">${name}</div>
                  <div style="font-size:10px;color:#94a3b8;margin-bottom:6px;">${currentCityConfig.name}, ${currentCityConfig.state}</div>
                  <div style="background:rgba(255,255,255,0.06);padding:6px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:10px;color:#cbd5e1;">Predicted Inundation:</span>
                    <span style="font-size:12px;font-weight:900;color:#F97316;">${depth}</span>
                  </div>
                </div>
              `);
            }
          });
          if (activeTab === 'hazard') {
            floodLayerRef.current.addTo(map);
          }
        }
      } catch { /* Flood zones optional */ }

      // ── 3.5. Load Historical Floods (Hotspots & Inundation Points) ───────────
      try {
        const historyUrl = selectedCity === 'chennai'
          ? '/data/neer-vazhvu/chennai/chennai-flood-inundation-depth.geojson'
          : selectedCity === 'mumbai'
          ? '/data/neer-vazhvu/mumbai/mumbai-flood-hotspots.geojson'
          : selectedCity === 'bengaluru'
          ? '/data/neer-vazhvu/bengaluru/bangalore-flood-hotspots.geojson'
          : selectedCity === 'hyderabad'
          ? '/data/neer-vazhvu/hyderabad/hyderabad-flood-hotspots.geojson'
          : '/data/neer-vazhvu/pune/pune-flood-hotspots.geojson';

        const historyRes = await fetch(historyUrl);
        if (historyRes.ok && isMounted) {
          const historyJson = await historyRes.json();
          historyLayerRef.current = L.geoJSON(historyJson, {
            style: () => ({
              fillColor: '#EF4444',
              color: '#FF0033',
              weight: 1.5,
              fillOpacity: 0.5,
              opacity: 0.9,
            }),
            pointToLayer: (feature, latlng) => {
              return L.circleMarker(latlng, {
                radius: 7.5,
                fillColor: '#EF4444',
                color: '#FFFFFF',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9,
              });
            },
            onEachFeature: (feature, layer) => {
              const p = feature.properties || {};
              const name = p.name || p.location?.split(',')[0] || (p.F_REMARKS ? `Inundation Spot (${p.F_REMARKS})` : 'Chronic Inundation Spot');
              const loc = p.location || p.street || (p.ward ? `Ward ${p.ward}` : `${currentCityConfig.name} Basin Area`);
              const ward = p.ward || 'Municipal Ward';
              const year = p.year || '2015-2024';
              const peakDepth = p.peak_depth_m ? `${p.peak_depth_m} m` : (p.DEPTH ? `${p.DEPTH} m` : '0.6 - 1.2 m');

              // Instant Area/City Tooltip on touch or hover
              layer.bindTooltip(`
                <div style="background:#0D1321;border:1px solid rgba(239,68,68,0.7);border-radius:8px;padding:4px 9px;color:#FFF;font-family:sans-serif;font-weight:800;font-size:11px;box-shadow:0 6px 18px rgba(0,0,0,0.85);white-space:nowrap;display:flex;align-items:center;gap:6px;">
                  <span style="color:#EF4444;font-size:13px;">📍</span>
                  <span style="color:#FFF;font-weight:900;">${name}</span>
                  <span style="color:#94a3b8;font-size:10px;font-weight:600;">· ${currentCityConfig.name}</span>
                </div>
              `, {
                direction: 'top',
                offset: [0, -8],
                opacity: 0.98,
                sticky: true,
              });

              // Click / Touch interaction
              layer.on('click', (e: any) => {
                setSelectedReservoir(null);
                setSelectedAsset({
                  id: p.feature_id || p.id || `${currentCityConfig.stateCode}-FL-SPOT`,
                  name: name,
                  type: 'HISTORICAL FLOOD CHRONIC HOTSPOT',
                  street: loc,
                  location: `${currentCityConfig.name} Urban Basin, ${currentCityConfig.state}`,
                  ward: ward,
                  zone: p.category_label || p.category || 'High Vulnerability Basin',
                  depth: Number(p.peak_depth_m || p.DEPTH || 0.95),
                  width: 4.5,
                  length: 120,
                  status: 'Chronic Inundation Spot',
                  material: 'Surface Depression & Drainage Choke',
                  flow_m3s: 2.8,
                  utilization: 96,
                  waterDepth_m: Number(p.peak_depth_m || p.DEPTH || 0.95),
                  riskScore: 89,
                });
              });

              // Hover enlargement animation
              layer.on('mouseover', function(this: any) {
                if (typeof this.setRadius === 'function') {
                  this.setRadius(11);
                  this.setStyle({ weight: 3.5, color: '#FEF08A', fillColor: '#DC2626' });
                }
              });
              layer.on('mouseout', function(this: any) {
                if (typeof this.setRadius === 'function') {
                  this.setRadius(7.5);
                  this.setStyle({ weight: 2, color: '#FFFFFF', fillColor: '#EF4444' });
                }
              });

              layer.bindPopup(`
                <div style="background:#0D1321;border:1px solid rgba(239,68,68,0.6);border-radius:12px;padding:12px;min-width:230px;color:#FFF;font-family:sans-serif;">
                  <div style="font-size:9px;color:#EF4444;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">🚨 HISTORICAL INUNDATION HOTSPOT</div>
                  <div style="font-size:14px;font-weight:900;margin-bottom:2px;color:#FFF;">${name}</div>
                  <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${loc} · <strong style="color:#FFF;">${currentCityConfig.name}, ${currentCityConfig.state}</strong></div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;">
                    <div style="background:rgba(255,255,255,0.06);padding:6px;border-radius:8px;text-align:center;">
                      <div style="color:#94a3b8;font-size:8px;">SURVEY PEAK</div>
                      <div style="color:#EF4444;font-weight:800;font-size:12px;">${peakDepth}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.06);padding:6px;border-radius:8px;text-align:center;">
                      <div style="color:#94a3b8;font-size:8px;">MONSOON YEAR</div>
                      <div style="color:#F59E0B;font-weight:800;font-size:12px;">${year}</div>
                    </div>
                  </div>
                </div>
              `);
            }
          });
          if (activeTab === 'history') {
            historyLayerRef.current.addTo(map);
          }
        }
      } catch { /* History optional */ }

      // ── 4. Load Sewerage GeoJSON for Selected City ────────────────────────────
      try {
        const sewerUrl = selectedCity === 'chennai'
          ? '/data/neer-vazhvu/chennai/chennai-sewerage.geojson'
          : selectedCity === 'bengaluru'
          ? '/data/neer-vazhvu/bengaluru/bangalore-sewerage-trunks.geojson'
          : selectedCity === 'hyderabad'
          ? '/data/neer-vazhvu/hyderabad/hyderabad-sewerage.geojson'
          : selectedCity === 'pune'
          ? '/data/neer-vazhvu/pune/pune-sewerage.geojson'
          : '/data/neer-vazhvu/mumbai/mumbai-drainage.geojson';

        const sewerRes = await fetch(sewerUrl);
        if (sewerRes.ok && isMounted) {
          const sewerJson = await sewerRes.json();
          sewerLayerRef.current = L.geoJSON(sewerJson, {
            style: () => {
              return {
                color: '#EC4899',
                weight: 3.0,
                opacity: 0.9,
                dashArray: '6 4',
              };
            },
            pointToLayer: (feature, latlng) => {
              const p = feature.properties || {};
              const isStp = p.layer === 'stp' || (p.name && p.name.toUpperCase().includes('STP'));

              if (isStp) {
                const stpIcon = L.divIcon({
                  className: 'stp-custom-icon',
                  html: `
                    <div style="
                      background: linear-gradient(135deg, #9333EA, #C026D3);
                      border: 2px solid #FFFFFF;
                      box-shadow: 0 0 16px rgba(192, 38, 211, 0.9), 0 0 4px rgba(0,0,0,0.8);
                      border-radius: 10px;
                      padding: 2px 7px;
                      display: flex;
                      align-items: center;
                      gap: 4px;
                      color: #FFFFFF;
                      font-weight: 900;
                      font-size: 10px;
                      letter-spacing: 0.5px;
                      cursor: pointer;
                      white-space: nowrap;
                      transform: translate(-50%, -50%);
                    ">
                      <span>⚡ STP</span>
                      <span style="background:rgba(0,0,0,0.3);padding:1px 4px;border-radius:4px;font-size:9px;font-family:monospace;">${p.capacity_mld || '90'} MLD</span>
                    </div>
                  `,
                  iconSize: [80, 24],
                  iconAnchor: [40, 12],
                });
                return L.marker(latlng, { icon: stpIcon });
              }

              return L.circleMarker(latlng, {
                radius: 5.5,
                fillColor: '#F43F5E',
                color: '#FFFFFF',
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.85,
              });
            },
            onEachFeature: (feature, layer) => {
              const p = feature.properties || {};
              const isStp = p.layer === 'stp' || (p.name && p.name.toUpperCase().includes('STP'));
              const name = p.name || (isStp ? 'Sewage Treatment Plant' : 'Sewage Pumping Station');
              const cap = p.capacity_mld ? `${p.capacity_mld} MLD` : 'Active Pumping Node';
              const road = p.road || p.street || 'Urban Drainage Corridor';

              layer.bindTooltip(`
                <div style="background:#0D1321;border:1px solid rgba(236,72,153,0.6);border-radius:8px;padding:4px 8px;color:#FFF;font-family:sans-serif;font-weight:800;font-size:11px;box-shadow:0 6px 18px rgba(0,0,0,0.85);white-space:nowrap;display:flex;align-items:center;gap:5px;">
                  <span style="color:#EC4899;font-size:12px;">⚡</span>
                  <span style="color:#FFF;">${name}</span>
                  <span style="color:#94a3b8;font-size:10px;font-weight:600;">· ${currentCityConfig.name}</span>
                </div>
              `, { direction: 'top', sticky: true });

              layer.on('click', (e: any) => {
                setSelectedReservoir(null);
                setSelectedAsset({
                  id: p.name || `${currentCityConfig.stateCode}-SPS`,
                  name: name,
                  type: isStp ? 'SEWAGE TREATMENT PLANT (STP)' : 'SEWAGE PUMPING STATION (SPS)',
                  street: road,
                  location: `${currentCityConfig.name} Sewerage Grid, ${currentCityConfig.state}`,
                  ward: p.stp_name || 'Central Drainage Zone',
                  zone: p.category ? `Category ${p.category} Station` : 'Municipal Grid',
                  depth: 2.8,
                  width: 1.2,
                  length: isStp ? 500 : 120,
                  status: p.status || 'OPERATIONAL',
                  material: 'Reinforced Concrete Sewer Trunk',
                  flow_m3s: isStp ? (Number(p.capacity_mld) || 120) * 0.0115 : 0.85,
                  utilization: isStp ? 88 : 74,
                  waterDepth_m: 2.1,
                  riskScore: isStp ? 38 : 28,
                });
              });
            },
          });
        }
      } catch { /* Sewerage optional */ }

      // ── 5. Create Reservoir & Dam Telemetry Layer ─────────────────────────────
      const resGroup = L.layerGroup();
      cityReservoirs.forEach(resItem => {
        const isCritical = resItem.capacityPct >= 95 || resItem.status === 'CRITICAL_FULL' || resItem.status === 'OVERFLOWING' || resItem.status === 'DISCHARGING';
        const isWarning = resItem.capacityPct >= 85;
        const color = isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#00B4D8';

        const resIcon = L.divIcon({
          className: 'custom-reservoir-icon',
          html: `
            <div style="
              position: relative;
              display: flex;
              align-items: center;
              gap: 8px;
              background: #0B111E;
              border: 2px solid ${color};
              box-shadow: 0 0 24px ${color}80, 0 6px 18px rgba(0,0,0,0.95);
              border-radius: 9999px;
              padding: 4px 12px 4px 6px;
              color: white;
              cursor: pointer;
              transform: translate(-50%, -50%);
              animation: ${isCritical ? 'pulse 2s infinite' : 'none'};
            ">
              <div style="
                width: 28px;
                height: 28px;
                border-radius: 9999px;
                background: ${color}25;
                border: 1.5px solid ${color};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
              ">
                🌊
              </div>
              <div>
                <div style="display:flex;align-items:center;gap:4px;">
                  <span style="font-size: 11px; font-weight: 900; letter-spacing: -0.2px; white-space: nowrap; color: #FFF;">
                    ${resItem.name.split(' ')[0]}
                  </span>
                  <span style="font-size: 8px; font-family: monospace; background: rgba(255,255,255,0.12); padding: 1px 4px; border-radius: 4px; color: #94a3b8;">
                    ${resItem.cwcStationId.split('-')[2] || 'DAM'}
                  </span>
                </div>
                <div style="font-size: 9px; font-weight: 900; font-family: monospace; color: ${color}; white-space: nowrap;">
                  ${resItem.capacityPct}% (${resItem.currentStorage_tmc.toFixed(2)} TMC) · ${resItem.currentLevel_ft} ft
                </div>
              </div>
            </div>
          `,
          iconSize: [140, 40],
          iconAnchor: [70, 20],
        });

        const marker = L.marker([resItem.lat, resItem.lng], { icon: resIcon });

        marker.bindTooltip(`
          <div style="background:#0D1321;border:1px solid rgba(56,189,248,0.6);border-radius:8px;padding:4px 8px;color:#FFF;font-family:sans-serif;font-weight:800;font-size:11px;box-shadow:0 6px 18px rgba(0,0,0,0.85);white-space:nowrap;display:flex;align-items:center;gap:5px;">
            <span style="font-size:12px;">🌊</span>
            <span style="color:#FFF;">${resItem.name} (${resItem.capacityPct}%)</span>
            <span style="color:#94a3b8;font-size:10px;font-weight:600;">· ${currentCityConfig.name}</span>
          </div>
        `, { direction: 'top', sticky: true });

        marker.on('click', () => {
          setSelectedAsset(null);
          setSelectedReservoir(resItem);
          map.flyTo([resItem.lat, resItem.lng], 13, { duration: 1.2 });
        });

        resGroup.addLayer(marker);
      });

      reservoirLayerGroupRef.current = resGroup;

      setIsMapReady(true);
    })();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [cityCoordinates, selectedCity, currentCityConfig, applyBasemap, cityReservoirs, basemap]);

  // ─── Switch Active Sub-Tabs (Hazard, History, Drainage, Sewerage, Reservoirs) ──────────
  const handleTabChange = (tab: ActiveSubTab) => {
    setActiveTab(tab);
    setSelectedAsset(null);
    setIsSimDrawerOpen(false);
    if (tab !== 'reservoirs') {
      setSelectedReservoir(null);
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    const showLayer = (ref: React.MutableRefObject<any>) => {
      if (ref.current && !map.hasLayer(ref.current)) ref.current.addTo(map);
    };
    const hideLayer = (ref: React.MutableRefObject<any>) => {
      if (ref.current && map.hasLayer(ref.current)) map.removeLayer(ref.current);
    };

    if (tab === 'drainage') {
      showLayer(drainageLayerRef);
      showLayer(riverLayerRef);
      hideLayer(floodLayerRef);
      hideLayer(historyLayerRef);
      hideLayer(sewerLayerRef);
      hideLayer(reservoirLayerGroupRef);
    } else if (tab === 'hazard') {
      showLayer(drainageLayerRef);
      showLayer(riverLayerRef);
      showLayer(floodLayerRef);
      hideLayer(historyLayerRef);
      hideLayer(sewerLayerRef);
      hideLayer(reservoirLayerGroupRef);
      if (floodLayerRef.current) {
        try { map.fitBounds(floodLayerRef.current.getBounds(), { padding: [40, 40], maxZoom: 13 }); } catch {}
      }
    } else if (tab === 'history') {
      showLayer(drainageLayerRef);
      showLayer(riverLayerRef);
      hideLayer(floodLayerRef);
      showLayer(historyLayerRef);
      hideLayer(sewerLayerRef);
      hideLayer(reservoirLayerGroupRef);
      if (historyLayerRef.current) {
        try { map.fitBounds(historyLayerRef.current.getBounds(), { padding: [40, 40], maxZoom: 13 }); } catch {}
      }
    } else if (tab === 'sewerage') {
      hideLayer(drainageLayerRef);
      showLayer(riverLayerRef);
      hideLayer(floodLayerRef);
      hideLayer(historyLayerRef);
      showLayer(sewerLayerRef);
      hideLayer(reservoirLayerGroupRef);
    } else if (tab === 'reservoirs') {
      hideLayer(drainageLayerRef);
      showLayer(riverLayerRef);
      hideLayer(floodLayerRef);
      hideLayer(historyLayerRef);
      hideLayer(sewerLayerRef);
      showLayer(reservoirLayerGroupRef);
      setSelectedReservoir(criticalReservoir);
    }
  };

  // ─── Elevation Layer Toggle ────────────────────────────────────────────────
  const toggleElevation = () => {
    setIsElevationActive(p => !p);
  };

  // ─── Basemap Switcher Handler ──────────────────────────────────────────────
  const handleBasemapChange = (newBase: BasemapType) => {
    setBasemap(newBase);
    const map = mapInstanceRef.current;
    if (map && typeof window !== 'undefined') {
      (async () => {
        const L = (await import('leaflet')).default;
        applyBasemap(newBase, map, L);
      })();
    }
  };

  // ─── Zoom Controls ─────────────────────────────────────────────────────────
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };
  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  // ─── Search Functionality ──────────────────────────────────────────────────
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    const query = searchQuery.toLowerCase();

    const matchedRes = cityReservoirs.find(r => r.name.toLowerCase().includes(query) || r.basin.toLowerCase().includes(query) || r.cwcStationId.toLowerCase().includes(query));
    if (matchedRes) {
      setSelectedReservoir(matchedRes);
      setSelectedAsset(null);
      mapInstanceRef.current.flyTo([matchedRes.lat, matchedRes.lng], 13, { duration: 1.5 });
      return;
    }

    const LOCATIONS: Record<string, [number, number]> = {
      menambedu: [80.1606, 13.1165],
      ambattur: [80.1510, 13.1200],
      karukku: [80.1650, 13.1220],
      madhavaram: [80.2330, 13.1490],
      tambaram: [80.1200, 12.9200],
      guindy: [80.2180, 13.0060],
      adyar: [80.2580, 13.0030],
      saidapet: [80.2220, 13.0210],
      velachery: [80.2180, 12.9790],
      kurla: [72.8745, 19.0688],
      dadar: [72.8478, 19.0178],
      marathahalli: [77.7000, 12.9560],
      koramangala: [77.6200, 12.9350],
      kukatpally: [78.4110, 17.4850],
      banjara: [78.4350, 17.4180],
      gachibowli: [78.3450, 17.4320],
      tolichowki: [78.3980, 17.4010],
      moosarambagh: [78.5080, 17.3720],
      begumpet: [78.4680, 17.4420],
      charminar: [78.4740, 17.3610],
      gandipet: [78.3030, 17.3780],
      himayatsagar: [78.3620, 17.3180],
      sinhagad: [73.8320, 18.4850],
      deccan: [73.8480, 18.5180],
      bhide: [73.8480, 18.5180],
      kothrud: [73.8020, 18.5050],
      swargate: [73.8550, 18.5010],
      hadapsar: [73.9180, 18.5120],
      baner: [73.7850, 18.5580],
      khadakwasla: [73.7650, 18.4410],
      panshet: [73.6150, 18.3750],
      varasgaon: [73.5780, 18.4020]
    };

    for (const [key, coords] of Object.entries(LOCATIONS)) {
      if (key.includes(query) || query.includes(key)) {
        mapInstanceRef.current.flyTo([coords[1], coords[0]], 14, { duration: 1.5 });
        break;
      }
    }
  };

  // ─── Filter Types Handler ──────────────────────────────────────────────────
  const handleFilterType = (type: string) => {
    setFilterType(type);
    const drainLayer = drainageLayerRef.current;
    if (!drainLayer) return;

    drainLayer.eachLayer((layer: any) => {
      const p = layer.feature?.properties || {};
      const rawType = (p?.drain_type || p?.type || '').toLowerCase();
      let match = true;

      if (type === 'swd') match = rawType.includes('swd') || (!rawType.includes('macro') && !rawType.includes('side'));
      else if (type === 'side') match = rawType.includes('side');
      else if (type === 'macro') match = rawType.includes('macro') || rawType.includes('trunk');
      else if (type === 'critical') match = p.status === 'Bad' || p.condition === 'Bad';

      if (match) {
        layer.setStyle({ opacity: 0.95, weight: 2.8 });
      } else {
        layer.setStyle({ opacity: 0.08, weight: 0.8 });
      }
    });
  };

  // ─── Emergency Route Computation ───────────────────────────────────────────
  const handleComputeSafeRoute = () => {
    setRouteLoading(true);
    setTimeout(async () => {
      setRouteLoading(false);
      setRouteResult({
        distance_km: 14.2,
        eta_min: 22,
        bypass_corridor: `Elevated Bypass via ${currentCityConfig.name} Primary Corridor`,
        safety_score: '99.4%',
        instructions: [
          'Depart Origin Node avoiding inundated Ground Level Nullahs',
          'Merge into elevated storm-resilient transit corridor',
          'Arrive safely at Emergency Outfall Base with 0.0m flood risk',
        ]
      });

      const map = mapInstanceRef.current;
      if (!map) return;

      const DEMO_SAFE: [number, number][] = [
        [cityCoordinates[1] + 0.04, cityCoordinates[0] - 0.03],
        [cityCoordinates[1] + 0.02, cityCoordinates[0] - 0.01],
        [cityCoordinates[1] - 0.01, cityCoordinates[0] + 0.02],
        [cityCoordinates[1] - 0.03, cityCoordinates[0] + 0.05],
      ];

      const L = (await import('leaflet')).default;
      L.polyline(DEMO_SAFE, { color: '#00B4D8', weight: 6, opacity: 1.0 }).addTo(map);
      map.fitBounds(DEMO_SAFE, { padding: [50, 50] });
    }, 600);
  };

  // ─── Trigger Reservoir Broadcast Simulation ─────────────────────────────────
  const handleSendIntimation = () => {
    setIntimationSuccess(true);
    setTimeout(() => {
      setIntimationSuccess(false);
      setIsIntimationModalOpen(false);
    }, 2200);
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-64px)] min-h-[720px] bg-[#070B12] text-white select-none overflow-hidden relative font-sans">

      {/* Global CSS for transparent leaflet tooltip container */}
      <style jsx global>{`
        .leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-tooltip-top:before,
        .leaflet-tooltip-bottom:before,
        .leaflet-tooltip-left:before,
        .leaflet-tooltip-right:before {
          display: none !important;
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 0. CRITICAL RESERVOIR FULL INTIMATION & OVERFLOW BANNER                   */}
      {/* ========================================================================= */}
      {criticalReservoir && criticalReservoir.capacityPct >= 90 && (
        <div className="shrink-0 bg-gradient-to-r from-red-950/95 via-[#991B1B]/90 to-red-950/95 border-b border-red-500/50 px-4 py-2 flex items-center justify-between z-30 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded uppercase tracking-wider shrink-0 font-mono">
              {criticalReservoir.cwcStationId} · {criticalReservoir.alertStage.replace('_', ' ')}
            </span>
            <p className="text-[11px] font-semibold text-red-100 truncate">
              {criticalReservoir.intimationMessage}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={() => {
                handleTabChange('reservoirs');
                setSelectedReservoir(criticalReservoir);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>Inspect Dam Telemetry</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsIntimationModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-lg shadow-red-500/30"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Broadcast Warning</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & NARRATIVE BANNER                                          */}
      {/* ========================================================================= */}
      <div className="shrink-0 bg-[#090E18] border-b border-white/10 px-5 pt-3 pb-2.5 z-20">
        
        {/* Main context headline */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[13px] sm:text-[14px] font-semibold text-white/95 tracking-tight leading-snug">
              Hydrodynamic Drainage, Sewerage &amp; CWC Dam Telemetry Grid
            </h1>
            {/* Direct Button for Line Colours & Zone Guide */}
            <button
              onClick={() => setIsLineInfoModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-[#00B4D8]/20 border border-white/15 hover:border-[#00B4D8]/50 text-[10px] font-bold text-[#38BDF8] transition-all cursor-pointer"
              title="Click to view complete Color &amp; Line Specifications for all networks"
            >
              <Palette className="w-3 h-3" />
              <span>Line Colours &amp; Zone Guide</span>
            </button>
          </div>

          {/* State & City Display Badge with Prominent Switcher */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-sky-950/80 to-blue-900/60 border border-sky-500/30 px-3 py-1 rounded-xl shadow-lg">
            <div className="flex flex-col">
              <span className="text-[8px] font-mono font-black text-[#38BDF8] uppercase tracking-widest leading-none">
                ACTIVE JURISDICTION: {currentCityConfig.state.toUpperCase()} ({currentCityConfig.stateCode})
              </span>
              <span className="text-[12px] font-extrabold text-white leading-tight">
                {currentCityConfig.name} Hydrodynamic Basin
              </span>
            </div>

            <div className="h-5 w-px bg-white/20 mx-1" />

            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="bg-[#0D1321] border border-white/20 text-white text-[11px] font-bold rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-[#38BDF8]"
            >
              {SUPPORTED_CITIES.map(c => (
                <option key={c.id} value={c.id} className="bg-[#090E18] text-white">
                  📍 {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic sub-header line */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1.5 text-[11px]">
          
          {/* Left stats pills or hazard dots */}
          <div className="flex items-center gap-4 flex-wrap">
            {activeTab === 'drainage' && (
              <div className="flex items-center gap-3 font-medium text-white/80">
                <span>
                  <strong className="text-white font-extrabold text-[12px] font-mono">{drainageStats.swdCount.toLocaleString()}</strong> storm water drains
                </span>
                <span className="text-white/30">•</span>
                <span>
                  <strong className="text-white font-extrabold text-[12px] font-mono">{drainageStats.sideDrainCount.toLocaleString()}</strong> side drains
                </span>
                <span className="text-white/30">•</span>
                <span>
                  <strong className="text-white font-extrabold text-[12px] font-mono">{drainageStats.macroMicroCount}</strong> macro/micro drains
                </span>
              </div>
            )}

            {activeTab === 'hazard' && (
              <div className="flex items-center gap-3 font-semibold text-[11px]">
                <span className="flex items-center gap-1.5 text-[#EF4444]"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Very High (&gt;0.6m)</span>
                <span className="flex items-center gap-1.5 text-[#F97316]"><span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" /> High (0.3-0.6m)</span>
                <span className="flex items-center gap-1.5 text-[#EAB308]"><span className="w-2.5 h-2.5 rounded-full bg-[#EAB308]" /> Moderate (0.15-0.3m)</span>
                <span className="flex items-center gap-1.5 text-[#10B981]"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Low (&lt;0.15m)</span>
                <span className="flex items-center gap-1.5 text-[#3B82F6]"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Safe Elevated</span>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="flex items-center gap-3 font-medium text-white/80">
                <span className="text-red-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                  Historical Inundation Hotspots &amp; Surveyed High-Water Marks Active
                </span>
              </div>
            )}

            {activeTab === 'sewerage' && (
              <div className="flex items-center gap-3 font-medium text-white/80">
                <span><strong className="text-white font-bold font-mono">1,248 km</strong> trunk sewers</span>
                <span className="text-white/30">•</span>
                <span><strong className="text-white font-bold font-mono">349</strong> sewage pumping stations (SPS)</span>
                <span className="text-white/30">•</span>
                <span><strong className="text-white font-bold font-mono">12</strong> treatment plants (STP)</span>
              </div>
            )}

            {activeTab === 'reservoirs' && (
              <div className="flex items-center gap-3 font-medium text-white/80">
                <span><strong className="text-[#38BDF8] font-black font-mono text-[13px]">{cityReservoirs.length} Major Reservoirs</strong> Monitored</span>
                <span className="text-white/30">•</span>
                <span><strong className="text-emerald-400 font-bold font-mono">CWC India-WRIS SCADA Inflow/Outflow</strong></span>
                <span className="text-white/30">•</span>
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                  Spillway &amp; Rule Curve Watch Active
                </span>
              </div>
            )}
          </div>

          {/* Basemap Style Selector */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/15 px-2.5 py-1 rounded-xl">
            <span className="text-[9px] font-mono uppercase text-white/50">Basemap:</span>
            <button
              onClick={() => handleBasemapChange('dark_labels')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                basemap === 'dark_labels' ? 'bg-[#38BDF8] text-black font-black' : 'text-white/60 hover:text-white'
              }`}
              title="Dark Canvas with State & City Names"
            >
              🌑 Dark Canvas
            </button>
            <button
              onClick={() => handleBasemapChange('osm_standard')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                basemap === 'osm_standard' ? 'bg-[#38BDF8] text-black font-black' : 'text-white/60 hover:text-white'
              }`}
              title="Standard OpenStreetMap"
            >
              🗺️ OSM
            </button>
            <button
              onClick={() => handleBasemapChange('satellite')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                basemap === 'satellite' ? 'bg-[#38BDF8] text-black font-black' : 'text-white/60 hover:text-white'
              }`}
              title="High-Res Satellite Imagery"
            >
              🛰️ Satellite
            </button>
          </div>
        </div>

        {/* Primary Navigation Pills including Reservoirs & Dams */}
        <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1">
          <button
            onClick={() => handleTabChange('hazard')}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'hazard'
                ? 'bg-[#1E293B] text-white border border-white/20 shadow-md ring-1 ring-orange-500/50'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Hazard Zones
          </button>

          <button
            onClick={() => handleTabChange('history')}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'history'
                ? 'bg-[#1E293B] text-white border border-white/20 shadow-md ring-1 ring-red-500/50'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Historical Floods
          </button>

          <button
            onClick={() => handleTabChange('drainage')}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'drainage'
                ? 'bg-[#1D3557] text-[#38BDF8] border border-[#38BDF8]/40 shadow-lg shadow-[#38BDF8]/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Drainage Network
          </button>

          <button
            onClick={() => handleTabChange('sewerage')}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'sewerage'
                ? 'bg-[#831843] text-[#F472B6] border border-[#F472B6]/40 shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Sewerage Network
          </button>

          <button
            onClick={() => handleTabChange('reservoirs')}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'reservoirs'
                ? 'bg-gradient-to-r from-blue-900 to-cyan-900 text-[#38BDF8] border border-[#38BDF8]/60 shadow-xl shadow-cyan-950/40 ring-1 ring-[#38BDF8]/30'
                : 'bg-cyan-950/30 text-cyan-200/80 hover:text-white hover:bg-cyan-900/40 border border-cyan-500/20'
            }`}
          >
            <span>🌊 Reservoirs &amp; Dams</span>
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono animate-pulse">
              CWC LIVE
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAP CANVAS CONTAINER & OVERLAYS                                        */}
      {/* ========================================================================= */}
      <div className="flex-1 relative w-full h-full min-h-0 bg-[#06090F]">
        
        {/* Leaflet Canvas Mount */}
        <div ref={mapContainerRef} className="w-full h-full bg-[#06090F]" />

        {/* Loading / Ready Transition Overlay to guarantee zero visual glitch */}
        {!isMapReady && (
          <div className="absolute inset-0 z-30 bg-[#06090F] flex flex-col items-center justify-center gap-3 transition-opacity duration-300">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
            </div>
            <div className="text-center space-y-1">
              <span className="text-[13px] font-extrabold text-white tracking-wide">
                Initializing Hydrodynamic Drainage &amp; CWC Dam Telemetry
              </span>
              <p className="text-[11px] text-white/50 font-mono">
                Coupling {currentCityConfig.name} Storm Water Conduits · CWC Stations · Sub-Basin Elevation
              </p>
            </div>
          </div>
        )}

        {/* ─── Top Left Map Controls (Zoom In, Zoom Out, Info Modal, Color Guide) ── */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 bg-[#0D1321]/90 backdrop-blur-md border border-white/20 rounded-xl p-1 shadow-2xl">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer border-t border-white/10"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsLineInfoModalOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#F59E0B] hover:bg-[#F59E0B]/15 transition-all cursor-pointer border-t border-white/10"
            title="Line Colours &amp; Zone Specifications Guide"
          >
            <Palette className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#38BDF8] hover:bg-[#38BDF8]/15 transition-all cursor-pointer border-t border-white/10"
            title="Dataset &amp; Hydrodynamic Methodology"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* ─── Top Right Controls (Search & Quick Filters) ───────────────────── */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          
          {/* Quick Filter Pill Selector */}
          {activeTab === 'drainage' && (
            <div className="hidden sm:flex items-center gap-1 bg-[#0D1321]/90 backdrop-blur-md border border-white/20 px-2 py-1 rounded-xl shadow-xl">
              <span className="text-[10px] text-white/40 font-mono uppercase px-1">Filter:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'swd', label: 'SWD' },
                { id: 'side', label: 'Side' },
                { id: 'macro', label: 'Macro' },
                { id: 'critical', label: '🚨 Surcharged' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => handleFilterType(f.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    filterType === f.id
                      ? 'bg-[#00B4D8] text-black shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Search Trigger / Expandable Input */}
          <div className="relative">
            {isSearchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center bg-[#0D1321] border border-[#00B4D8]/50 rounded-xl px-2.5 py-1.5 shadow-2xl">
                <Search className="w-3.5 h-3.5 text-[#00B4D8] mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${currentCityConfig.name} reservoirs, drains, CWC stations...`}
                  className="bg-transparent text-[11px] text-white placeholder-white/40 focus:outline-none w-64 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="text-white/50 hover:text-white ml-1 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-9 h-9 bg-[#0D1321]/90 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-white/80 hover:text-[#00B4D8] transition-all shadow-xl cursor-pointer"
                title="Search Grid &amp; Reservoirs"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Simulation Drawer Toggle */}
          <button
            onClick={() => setIsSimDrawerOpen(p => !p)}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xl cursor-pointer ${
              isSimDrawerOpen
                ? 'bg-[#F56A00] text-white border-[#F56A00]'
                : 'bg-[#0D1321]/90 backdrop-blur-md border-white/20 text-white/80 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Monsoon Sim</span>
          </button>
        </div>

        {/* ─── Bottom Left: Ground Elevation Checkbox ───────────────────────── */}
        <div className="absolute bottom-6 left-4 z-20">
          <label className="flex items-center gap-2.5 bg-[#0D1321]/95 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-xl shadow-2xl cursor-pointer hover:border-white/40 transition-all">
            <input
              type="checkbox"
              checked={isElevationActive}
              onChange={toggleElevation}
              className="w-4 h-4 rounded border-white/30 text-[#00B4D8] bg-black/40 focus:ring-0 cursor-pointer"
            />
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/90">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 inline-block" />
              <span>Ground Elevation (FABDEM Copernicus 30m)</span>
            </div>
          </label>
        </div>

        {/* ─── Bottom Right: Interactive Legend Widget with Color Explanations ─ */}
        <div className="absolute bottom-6 right-4 z-20 w-72 bg-[#0D1321]/97 backdrop-blur-md border border-white/25 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-3.5 py-2 flex items-center justify-between border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="text-[10px] font-extrabold text-white/90 tracking-wider uppercase">
                {activeTab === 'hazard' ? 'FLOOD HAZARD LEVEL'
                  : activeTab === 'reservoirs' ? 'RESERVOIR & CWC STATIONS'
                  : activeTab === 'sewerage' ? 'SEWERAGE NETWORK'
                  : activeTab === 'history' ? 'HISTORICAL FLOODS'
                  : 'DRAINAGE NETWORK — LINE COLOURS'}
              </span>
            </div>
            <button
              onClick={() => setIsLineInfoModalOpen(true)}
              className="text-[#38BDF8] hover:text-white text-[10px] font-mono font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
              title="View Complete Color &amp; Engineering Matrix"
            >
              <span>Specs</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Legend content with rich engineering info */}
          <div className="p-3 space-y-2 text-[11px]">

            {/* ── Drainage legend ── */}
            {activeTab === 'drainage' && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-6 rounded" style={{ height: '4px', background: '#EF4444' }} />
                    <span className="text-white/85 font-semibold">Macro Drain</span>
                  </div>
                  <span className="text-[9px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded">Trunk 3.8px</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-6 rounded" style={{ height: '2.5px', background: '#EA580C' }} />
                    <span className="text-white/85 font-semibold">Micro / Nullah</span>
                  </div>
                  <span className="text-[9px] font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.2 rounded">Feeder 2.5px</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-6 rounded" style={{ height: '2px', background: '#00B4D8' }} />
                    <span className="text-white/85 font-semibold">Storm Water Drain</span>
                  </div>
                  <span className="text-[9px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded">SWD 2.0px</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-6 rounded" style={{ height: '2px', background: '#A855F7' }} />
                    <span className="text-white/85 font-semibold">Side / Kerb Drain</span>
                  </div>
                  <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded">Kerb 2.0px</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-6 rounded" style={{ height: '2px', background: '#F59E0B' }} />
                    <span className="text-white/85 font-semibold">Open Drain</span>
                  </div>
                  <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">Unlined 2.0px</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-6 rounded" style={{ height: '4.5px', background: '#06B6D4' }} />
                    <span className="text-white/85 font-semibold">River / Main Channel</span>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.2 rounded">River 4.8px</span>
                </div>
              </>
            )}

            {/* ── Hazard legend ── */}
            {activeTab === 'hazard' && (
              <>
                {[
                  { color: '#EF4444', label: 'Very High Risk', depth: '> 0.60 m' },
                  { color: '#F97316', label: 'High Risk', depth: '0.30 - 0.60 m' },
                  { color: '#EAB308', label: 'Moderate Risk', depth: '0.15 - 0.30 m' },
                  { color: '#10B981', label: 'Low Risk', depth: '< 0.15 m' },
                  { color: '#3B82F6', label: 'Safe / Elevated', depth: '0.00 m' },
                ].map(({ color, label, depth }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="shrink-0 w-3.5 h-3.5 rounded-sm" style={{ background: `${color}70`, border: `1.5px solid ${color}` }} />
                      <span className="text-white/85 font-semibold">{label}</span>
                    </div>
                    <span className="text-[9px] font-mono text-white/50">{depth}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-6 rounded" style={{ height: '4px', background: '#06B6D4' }} />
                    <span className="text-white/85 font-semibold">Natural Riverbed</span>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-400">Main Arterial</span>
                </div>
              </>
            )}

            {/* ── History legend ── */}
            {activeTab === 'history' && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                    <span className="text-white/90 font-bold">Chronic Inundation Spot</span>
                  </div>
                  <span className="text-[9px] font-mono text-red-400">Survey Hotspot</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-4 h-4 rounded border border-red-500 bg-red-500/40" />
                    <span className="text-white/85 font-semibold">Survey High-Water Mark</span>
                  </div>
                  <span className="text-[9px] font-mono text-orange-400">Historical Extent</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-6 rounded" style={{ height: '4px', background: '#06B6D4' }} />
                    <span className="text-white/85 font-semibold">River Channel</span>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-300">Corridor</span>
                </div>
              </>
            )}

            {/* ── Sewerage legend ── */}
            {activeTab === 'sewerage' && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-6 rounded" style={{ height: '3px', background: '#EC4899', borderTop: '2px dashed #EC4899', backgroundColor: 'transparent' }} />
                    <span className="text-white/85 font-semibold">Trunk Sewer</span>
                  </div>
                  <span className="text-[9px] font-mono text-pink-400">Dashed 3.0px</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-3.5 h-3.5 rounded-full" style={{ background: '#F43F5E', border: '2px solid #fff' }} />
                    <span className="text-white/85 font-semibold">Pumping Station (SPS)</span>
                  </div>
                  <span className="text-[9px] font-mono text-rose-400">Vector Circle</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-4 h-4 rounded-md flex items-center justify-center text-[9px]" style={{ background: 'linear-gradient(135deg,#9333EA,#C026D3)', border: '1px solid #fff' }}>⚡</span>
                    <span className="text-white/85 font-semibold">Treatment Plant (STP)</span>
                  </div>
                  <span className="text-[9px] font-mono text-purple-300">MLD Badge</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-6 rounded" style={{ height: '4px', background: '#06B6D4' }} />
                    <span className="text-white/85 font-semibold">Effluent Outfall</span>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-400">Discharge</span>
                </div>
              </>
            )}

            {/* ── Reservoirs legend ── */}
            {activeTab === 'reservoirs' && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 relative w-3.5 h-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500" />
                    </span>
                    <span className="text-white/90 font-bold">≥95% FRL (Discharge)</span>
                  </div>
                  <span className="text-[9px] font-mono text-red-400">Red Alert</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-amber-400" />
                    <span className="text-white/85 font-semibold">85%–95% FRL (Critical)</span>
                  </div>
                  <span className="text-[9px] font-mono text-amber-400">Orange Alert</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-[#00B4D8]" />
                    <span className="text-white/85 font-semibold">&lt;85% FRL (Regulated)</span>
                  </div>
                  <span className="text-[9px] font-mono text-sky-400">Blue Alert</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 w-6 rounded" style={{ height: '4px', background: '#06B6D4' }} />
                    <span className="text-white/85 font-semibold">Inundation Corridor</span>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-300">Lead Time</span>
                </div>
              </>
            )}
          </div>

          {/* Leaflet Attribution Bar */}
          <div className="bg-black/60 px-3 py-1 text-[9px] text-white/40 font-mono border-t border-white/5">
            © Esri / OpenStreetMap · JalRakshak Hydrodynamic
          </div>
        </div>

        {/* ─── Right Slide-Out Inspector Drawer (Dam & Reservoir Intelligence) ─── */}
        {selectedReservoir && (
          <div className="absolute top-4 right-4 bottom-6 w-84 md:w-104 bg-[#0B101D]/97 backdrop-blur-2xl border border-cyan-500/40 rounded-3xl p-5 shadow-2xl z-30 flex flex-col overflow-y-auto space-y-4">
            
            {/* Drawer Header with CWC Station ID & Authority */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-[#38BDF8] font-black bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded uppercase tracking-wider">
                    {selectedReservoir.cwcStationId}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    CWC WRIS ACTIVE
                  </span>
                </div>
                <h2 className="text-[17px] font-extrabold text-white leading-tight">
                  {selectedReservoir.name}
                </h2>
                <div className="text-[11px] text-white/60 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">{selectedReservoir.authority}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReservoir(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dam Engineering Characteristics Badge */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[10px] font-mono text-white/70">
              <div>
                <span className="text-white/40 block text-[8px]">STRUCTURE TYPE</span>
                <span className="text-white font-bold">{selectedReservoir.damType}</span>
              </div>
              <div className="text-right">
                <span className="text-white/40 block text-[8px]">CATCHMENT AREA</span>
                <span className="text-cyan-400 font-bold">{selectedReservoir.catchmentArea_sqkm} km²</span>
              </div>
            </div>

            {/* Live Storage & TMC Metric Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-950/40 to-black/70 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[28px] font-black text-white font-mono leading-none flex items-baseline gap-1.5">
                    {selectedReservoir.capacityPct}%
                    <span className="text-[12px] font-normal text-white/60">Live Storage</span>
                  </div>
                  <div className="text-[11px] text-cyan-300 font-mono font-bold mt-1">
                    {selectedReservoir.currentStorage_tmc.toFixed(3)} / {selectedReservoir.fullCapacity_tmc.toFixed(3)} TMC
                  </div>
                  <div className="text-[9px] text-white/40 font-mono">
                    ({selectedReservoir.currentStorage_mcft.toLocaleString()} / {selectedReservoir.fullCapacity_mcft.toLocaleString()} Mcft)
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black border uppercase font-mono text-center ${
                  selectedReservoir.capacityPct >= 95
                    ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'
                    : selectedReservoir.capacityPct >= 85
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                }`}>
                  {selectedReservoir.alertStage.replace('_', ' ')}
                </span>
              </div>

              {/* Live Level Bar with Rule Curve Target */}
              <div className="space-y-1">
                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5 border border-white/20 relative">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      selectedReservoir.capacityPct >= 95
                        ? 'bg-gradient-to-r from-red-600 to-red-400'
                        : selectedReservoir.capacityPct >= 85
                        ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    }`}
                    style={{ width: `${selectedReservoir.capacityPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-white/40">
                  <span>Dead Storage: {selectedReservoir.deadStorage_mcft} Mcft</span>
                  <span className="text-emerald-400 font-bold">Rule Curve Limit: {selectedReservoir.ruleCurveLimit_ft} ft</span>
                </div>
              </div>

              {/* Water Level vs Full Reservoir Level (Dual Units: ft & m MSL) */}
              <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[8px] uppercase">Current Water Elevation</span>
                  <span className="text-white font-black text-[13px]">{selectedReservoir.currentLevel_ft} ft</span>
                  <span className="text-[9px] text-white/50 block font-normal">({selectedReservoir.currentLevel_m.toFixed(2)} m MSL)</span>
                </div>
                <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[8px] uppercase">Full Reservoir Level (FRL)</span>
                  <span className="text-cyan-400 font-black text-[13px]">{selectedReservoir.fullLevel_ft} ft</span>
                  <span className="text-[9px] text-cyan-300/60 block font-normal">({selectedReservoir.fullLevel_m.toFixed(2)} m MSL)</span>
                </div>
              </div>
            </div>

            {/* Inflow vs Spillway Outflow Telemetry */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
              <div className="text-[10px] font-extrabold uppercase text-white/50 font-mono flex items-center justify-between">
                <span>SCADA Inflow &amp; Spillway Outflow</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Live CWC SCADA
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[8px] text-white/50 uppercase font-mono">HYDROLOGIC INFLOW</div>
                  <div className="text-[15px] font-black text-[#38BDF8] font-mono mt-0.5">
                    {selectedReservoir.inflow_cusecs.toLocaleString()} <span className="text-[9px]">cusecs</span>
                  </div>
                  <div className="text-[9px] text-cyan-300/70 font-mono">({selectedReservoir.inflow_cumecs} m³/s)</div>
                </div>

                <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                  <div className="text-[8px] text-white/50 uppercase font-mono">SPILLWAY DISCHARGE</div>
                  <div className="text-[15px] font-black text-red-400 font-mono mt-0.5">
                    {selectedReservoir.outflow_cusecs.toLocaleString()} <span className="text-[9px]">cusecs</span>
                  </div>
                  <div className="text-[9px] text-red-300/70 font-mono">({selectedReservoir.outflow_cumecs} m³/s)</div>
                </div>
              </div>

              {/* Sluice / Radial Gate Specifications */}
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Spillway Sluice Gates:</span>
                  <strong className="text-white font-mono font-bold">
                    {selectedReservoir.sluiceGatesOpen} of {selectedReservoir.sluiceGatesTotal} Gates Raised ({selectedReservoir.gateLift_ft} ft Lift)
                  </strong>
                </div>
                <div className="text-[10px] text-white/50 font-mono">
                  Gate Type: <span className="text-white/80 font-semibold">{selectedReservoir.gateDimensions}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] font-mono">
                  <span className="text-white/50">Historical Peak: {selectedReservoir.historicalPeak_cusecs.toLocaleString()} cusecs ({selectedReservoir.historicalPeakYear})</span>
                  <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">Rule Curve OK</span>
                </div>
              </div>
            </div>

            {/* Downstream Inundation Forecast & Lead Time */}
            <div className="p-3 bg-red-950/25 border border-red-500/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-red-400 uppercase font-mono">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Downstream Inundation Corridors</span>
                </div>
                <span className="text-[9px] font-mono bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded border border-red-500/40 font-bold">
                  Lead Time: ~{selectedReservoir.leadTimeToCity_hrs} hrs
                </span>
              </div>
              <div className="text-[10px] text-white/70 font-mono">
                Primary River: <strong className="text-white">{selectedReservoir.downstreamRiver}</strong>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedReservoir.downstreamWarningAreas.map((area, idx) => (
                  <span key={idx} className="bg-red-500/20 text-red-200 border border-red-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    ⚠️ {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Intimation & Early Warning Action */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => setIsIntimationModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-[12px] font-black flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Issue Sluice Gate Full Intimation</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── Right Slide-Out Inspector Drawer (Asset/Drain/Sewer/Hotspot) ─── */}
        {selectedAsset && !selectedReservoir && (
          <div className="absolute top-4 right-4 bottom-6 w-80 md:w-96 bg-[#0B101D]/95 backdrop-blur-xl border border-white/20 rounded-3xl p-5 shadow-2xl z-30 flex flex-col overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono text-[#00B4D8] font-bold uppercase tracking-wider block">
                  {selectedAsset.ward || 'WARD INTELLIGENCE'}
                </span>
                <h2 className="text-[16px] font-extrabold text-white leading-tight mt-0.5">
                  {selectedAsset.name}
                </h2>
                <p className="text-[11px] text-white/50">{selectedAsset.location || 'Drainage Corridor'}</p>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Depth to Water / Surcharge Metric */}
            <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[28px] font-black text-white font-mono leading-none">
                    {selectedAsset.depth?.toFixed(2)}m
                  </div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wide mt-1">
                    {selectedAsset.type.includes('HOTSPOT') ? 'Survey Inundation Depth' : 'Conduit Invert Depth'}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-xl text-[11px] font-extrabold border ${
                  selectedAsset.status?.includes('Critical') || selectedAsset.status?.includes('Chronic') || selectedAsset.utilization! >= 85
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {selectedAsset.status || 'Active'}
                </span>
              </div>
            </div>

            {/* Cross-section Animated SVG */}
            <div className="mt-4 p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-[10px] font-extrabold uppercase text-white/40 mb-2 font-mono">
                Hydrodynamic Profile &amp; Load
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="44" fill="#141B2D" stroke="#334155" strokeWidth="6" />
                    <clipPath id="pipe-clip-inspect">
                      <circle cx="50" cy="50" r="41" />
                    </clipPath>
                    <rect
                      x="0"
                      y={Math.max(8, 92 - (selectedAsset.utilization || 50) * 0.84)}
                      width="100" height="100"
                      fill={selectedAsset.utilization! >= 85 ? '#EF4444' : '#00B4D8'}
                      opacity="0.85"
                      clipPath="url(#pipe-clip-inspect)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[13px] font-black text-white font-mono">{selectedAsset.utilization}%</span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div>
                    <div className="text-white/40">WIDTH (W)</div>
                    <div className="font-extrabold text-white text-[12px]">{selectedAsset.width || 0.8} m</div>
                  </div>
                  <div>
                    <div className="text-white/40">DISCHARGE (Q)</div>
                    <div className="font-extrabold text-[#00B4D8] text-[12px]">{(selectedAsset.flow_m3s || 1.8).toFixed(1)} m³/s</div>
                  </div>
                  <div>
                    <div className="text-white/40">TYPE</div>
                    <div className="font-extrabold text-white text-[11px] truncate">{selectedAsset.type}</div>
                  </div>
                  <div>
                    <div className="text-white/40">STATUS</div>
                    <div className="font-extrabold text-emerald-400 text-[12px] truncate">{selectedAsset.status || 'Active'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 space-y-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setIsRouterActive(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#00B4D8] text-white text-[12px] font-extrabold flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-[#00B4D8]/20 transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4" /> Compute Flood-Safe Bypass Route
              </button>
            </div>
          </div>
        )}

        {/* ─── Simulation Drawer ────────────────────────────────────────────── */}
        {isSimDrawerOpen && (
          <div className="absolute top-16 right-4 w-80 bg-[#0B101D]/95 backdrop-blur-xl border border-[#F56A00]/40 rounded-3xl p-5 shadow-2xl z-30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#F56A00] font-extrabold text-[13px]">
                <Sliders className="w-4 h-4" /> Monsoon Runoff Simulator
              </div>
              <button onClick={() => setIsSimDrawerOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rainfall Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-white/60">Rainfall Intensity</span>
                <strong className="text-white">{simRainfall} mm/hr</strong>
              </div>
              <input
                type="range" min="0" max="150" value={simRainfall}
                onChange={e => setSimRainfall(Number(e.target.value))}
                className="w-full accent-[#F56A00] cursor-pointer"
              />
            </div>

            {/* Blockage Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-white/60">Culvert Siltation / Choke</span>
                <strong className="text-white">{simBlockage}%</strong>
              </div>
              <input
                type="range" min="0" max="100" value={simBlockage}
                onChange={e => setSimBlockage(Number(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />
            </div>

            {/* Tide Level */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-white/60">High Tide Surge</span>
                <strong className="text-white">{simTide} m</strong>
              </div>
              <input
                type="range" min="0.5" max="4.5" step="0.1" value={simTide}
                onChange={e => setSimTide(Number(e.target.value))}
                className="w-full accent-[#00B4D8] cursor-pointer"
              />
            </div>

            <button
              onClick={() => {
                const drainLayer = drainageLayerRef.current;
                if (!drainLayer) return;
                drainLayer.eachLayer((layer: any) => {
                  const p = layer.feature?.properties || {};
                  if (p.status === 'Bad' || p.condition === 'Bad' || simBlockage > 50) {
                    layer.setStyle({ color: '#FF0033', weight: 4.5, opacity: 1.0 });
                  }
                });
              }}
              className="w-full py-2 bg-[#F56A00] hover:bg-[#F56A00]/90 text-white rounded-xl text-[12px] font-extrabold transition-all cursor-pointer"
            >
              Recalculate Backflow Risk
            </button>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 3. FULL-SCREEN GLOBAL FIXED MODALS (NEVER CLIPPED BY CONTAINER)          */}
      {/* ========================================================================= */}

      {/* ─── Emergency Route Overlay Dialog ───────────────────────────────── */}
      {isRouterActive && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#0B101D] border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-white relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#00B4D8] font-black text-[15px]">
                <Navigation className="w-5 h-5" /> JalRakshak Emergency Bypass Router
              </div>
              <button onClick={() => setIsRouterActive(false)} className="text-white/60 hover:text-white cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[10px] text-white/40 uppercase font-mono block mb-1">Origin Node</label>
              <input
                type="text" value={routeOrigin} onChange={e => setRouteOrigin(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-[12px] text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-white/40 uppercase font-mono block mb-1">Destination Outfall</label>
              <input
                type="text" value={routeDest} onChange={e => setRouteDest(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-[12px] text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-white/40 uppercase font-mono block mb-1">Vehicle Classification</label>
              <select
                value={routeVehicle} onChange={e => setRouteVehicle(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-[12px] text-white font-mono"
              >
                <option value="EMERGENCY_AMBULANCE">🚑 Emergency Ambulance (30 cm water limit)</option>
                <option value="COMMUTER_CAR">🚗 Standard Passenger Car (15 cm water limit)</option>
                <option value="HIGH_CLEARANCE_TRUCK">🚛 High-Clearance Rescue Vehicle (60 cm limit)</option>
              </select>
            </div>

            <button
              onClick={handleComputeSafeRoute}
              disabled={routeLoading}
              className="w-full py-3 rounded-xl bg-[#00B4D8] hover:bg-[#00B4D8]/90 text-black text-[13px] font-black flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shadow-lg shadow-[#00B4D8]/20"
            >
              {routeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              <span>Compute Real-Time Safe Bypass</span>
            </button>

            {routeResult && (
              <div className="p-3 bg-[#00B4D8]/10 border border-[#00B4D8]/30 rounded-2xl space-y-2">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#00B4D8] font-bold">Safe Corridor: {routeResult.distance_km} km</span>
                  <span className="text-emerald-400 font-bold">ETA: ~{routeResult.eta_min} min</span>
                </div>
                <div className="text-[10px] text-white/70 font-mono">{routeResult.bypass_corridor}</div>
                <div className="text-[9px] text-emerald-400 font-mono">Safety Confidence: {routeResult.safety_score}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Reservoir Full Intimation Broadcast Modal ────────────────────── */}
      {isIntimationModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#0D1321] border border-red-500/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-white relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-red-400 font-black text-[16px]">
                <Radio className="w-5 h-5 animate-pulse" />
                <span>Early Warning &amp; Dam Spillway Intimation Broadcast</span>
              </div>
              <button onClick={() => setIsIntimationModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {intimationSuccess ? (
              <div className="p-6 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-[16px] font-black text-white">Emergency Intimation Dispatched!</h3>
                <p className="text-[12px] text-white/70">
                  Automated priority dispatch routed to Central Water Commission (CWC), State Disaster Management Authority (SDMA), District Collectorate EOC, and riverbank sirens along {criticalReservoir.basin}.
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-red-400 font-black uppercase">
                      CRITICAL DAM NODE: {criticalReservoir.name} ({criticalReservoir.cwcStationId})
                    </span>
                    <span className="text-[9px] font-mono text-red-300 font-bold bg-red-600/40 px-2 py-0.5 rounded">
                      {criticalReservoir.outflow_cusecs.toLocaleString()} CUSECS DISCHARGE
                    </span>
                  </div>
                  <p className="text-[12px] text-white/90 leading-relaxed">
                    {criticalReservoir.intimationMessage}
                  </p>
                </div>

                <div className="space-y-2 text-[12px]">
                  <div className="text-white/60 text-[11px] font-mono uppercase">Inter-Agency Dispatch Channels:</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <label className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10 cursor-pointer">
                      <input type="checkbox" defaultChecked className="accent-red-500" />
                      <span>State Disaster Mgmt (SDMA/NDRF)</span>
                    </label>
                    <label className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10 cursor-pointer">
                      <input type="checkbox" defaultChecked className="accent-red-500" />
                      <span>Public Warning Siren Network</span>
                    </label>
                    <label className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10 cursor-pointer">
                      <input type="checkbox" defaultChecked className="accent-red-500" />
                      <span>District Revenue EOC &amp; SMS</span>
                    </label>
                    <label className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10 cursor-pointer">
                      <input type="checkbox" defaultChecked className="accent-red-500" />
                      <span>Traffic Police Bridge Diversions</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsIntimationModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendIntimation}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[12px] font-black flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Confirm &amp; Broadcast Alert</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── FIXED MODAL: Line Colours & Zone Specifications Matrix ────────── */}
      {isLineInfoModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[99999] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-[#0B101D] border border-cyan-500/50 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 text-white max-h-[85vh] overflow-y-auto z-[100000] relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 sticky top-0 bg-[#0B101D] z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[16px] font-extrabold text-white">Line Colours &amp; Layer Specifications Guide</h2>
                  <p className="text-[11px] text-white/50 font-mono">Standardized Geospatial Color Matrix for Drainage, Sewerage &amp; Hazard Zones</p>
                </div>
              </div>
              <button
                onClick={() => setIsLineInfoModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Drainage Network Lines */}
            <div className="space-y-2">
              <h3 className="text-[12px] font-extrabold text-[#38BDF8] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span>1. Drainage Network Conduits &amp; Rivers</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-1 rounded bg-[#EF4444]" />
                      <strong className="text-white">Macro Drain (Trunk)</strong>
                    </div>
                    <span className="font-mono text-[10px] text-red-400 font-bold">#EF4444 · 3.8px</span>
                  </div>
                  <p className="text-white/60 text-[10px]">
                    Primary arterial open/box stormwater channels (width &gt; 3.0 m) conveying high runoff volumes to river outfalls.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-0.5 rounded bg-[#EA580C]" />
                      <strong className="text-white">Micro Drain / Nullah</strong>
                    </div>
                    <span className="font-mono text-[10px] text-orange-400 font-bold">#EA580C · 2.5px</span>
                  </div>
                  <p className="text-white/60 text-[10px]">
                    Neighborhood collector channels and natural feeder streams (width 1.5 - 3.0 m) discharging into macro trunks.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-0.5 rounded bg-[#00B4D8]" />
                      <strong className="text-white">Storm Water Drain (SWD)</strong>
                    </div>
                    <span className="font-mono text-[10px] text-sky-400 font-bold">#00B4D8 · 2.2px</span>
                  </div>
                  <p className="text-white/60 text-[10px]">
                    Standard municipal underground RCC box conduits and roadside covered drainage networks (width 0.6 - 1.5 m).
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-0.5 rounded bg-[#A855F7]" />
                      <strong className="text-white">Side / Road-edge Drain</strong>
                    </div>
                    <span className="font-mono text-[10px] text-purple-400 font-bold">#A855F7 · 2.0px</span>
                  </div>
                  <p className="text-white/60 text-[10px]">
                    Kerb-level street runoff interceptors and footpath margin drains designed to prevent pavement ponding.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-0.5 rounded bg-[#F59E0B]" />
                      <strong className="text-white">Open Drain (Unlined)</strong>
                    </div>
                    <span className="font-mono text-[10px] text-amber-400 font-bold">#F59E0B · 2.0px</span>
                  </div>
                  <p className="text-white/60 text-[10px]">
                    Natural earthen or unlined surface ditches subject to high siltation risks during intense monsoons.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-1.5 rounded bg-[#06B6D4]" />
                      <strong className="text-white">River / Estuary Course</strong>
                    </div>
                    <span className="font-mono text-[10px] text-cyan-300 font-bold">#06B6D4 · 4.8px</span>
                  </div>
                  <p className="text-white/60 text-[10px]">
                    Major natural water corridors (Adyar, Cooum, Mithi, Mutha, Musi, Arkavathi) receiving stormwater and dam discharge.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Sewerage Network Lines */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h3 className="text-[12px] font-extrabold text-[#F472B6] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span>2. Sewerage Infrastructure &amp; Treatment</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-0.5 border-t-2 border-dashed border-[#EC4899]" />
                      <strong className="text-white">Trunk Sewer Mains</strong>
                    </div>
                    <span className="font-mono text-[10px] text-pink-400 font-bold">#EC4899 · Dashed</span>
                  </div>
                  <p className="text-white/60 text-[10px]">
                    High-capacity wastewater pipelines and gravity trunk mains leading to treatment plants.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#F43F5E] border border-white" />
                      <strong className="text-white">Sewage Pumping Stations (SPS)</strong>
                    </div>
                    <span className="font-mono text-[10px] text-rose-400 font-bold">#F43F5E Node</span>
                  </div>
                  <p className="text-white/60 text-[10px]">
                    Submersible/centrifugal lift stations pumping wastewater over topographic divides.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black text-white bg-gradient-to-r from-purple-600 to-fuchsia-600">⚡ STP</span>
                      <strong className="text-white">Sewage Treatment Plants (STP)</strong>
                    </div>
                    <span className="font-mono text-[10px] text-purple-300 font-bold">MLD Capacity Rated</span>
                  </div>
                  <p className="text-white/60 text-[10px]">
                    Major biochemical/SBR wastewater treatment facilities with live Million Liters per Day (MLD) capacity tracking.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Flood Hazard Risk Zones */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h3 className="text-[12px] font-extrabold text-[#EAB308] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span>3. Flood Hazard Risk Zones (Inundation Thresholds)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono text-center">
                <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40">
                  <div className="font-extrabold text-red-400 text-[11px]">VERY HIGH</div>
                  <div className="text-white font-bold mt-0.5">&gt; 0.60 m</div>
                  <div className="text-white/50 text-[9px]">Severe Backflow</div>
                </div>
                <div className="p-2 rounded-xl bg-orange-500/20 border border-orange-500/40">
                  <div className="font-extrabold text-orange-400 text-[11px]">HIGH</div>
                  <div className="text-white font-bold mt-0.5">0.30 - 0.60 m</div>
                  <div className="text-white/50 text-[9px]">Vehicular Stall</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40">
                  <div className="font-extrabold text-amber-400 text-[11px]">MODERATE</div>
                  <div className="text-white font-bold mt-0.5">0.15 - 0.30 m</div>
                  <div className="text-white/50 text-[9px]">Pavement Ponding</div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
                  <div className="font-extrabold text-emerald-400 text-[11px]">LOW</div>
                  <div className="text-white font-bold mt-0.5">&lt; 0.15 m</div>
                  <div className="text-white/50 text-[9px]">Nominal Drainage</div>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/40 col-span-2 sm:col-span-1">
                  <div className="font-extrabold text-blue-400 text-[11px]">VERY LOW</div>
                  <div className="text-white font-bold mt-0.5">0.00 m</div>
                  <div className="text-white/50 text-[9px]">Elevated Safe</div>
                </div>
              </div>
            </div>

            {/* 4. Dam & Reservoir Status Indicators */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h3 className="text-[12px] font-extrabold text-[#00B4D8] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span>4. Dam &amp; Reservoir Telemetry Status</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <strong className="text-red-300 font-bold">RED ALERT (≥95%)</strong>
                  </div>
                  <p className="text-white/60 text-[10px]">Crest spillway gates open; active surplus water release into river corridor.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <strong className="text-amber-300 font-bold">ORANGE ALERT (85-95%)</strong>
                  </div>
                  <p className="text-white/60 text-[10px]">Approaching FRL storage; rule curve compliance regulated buffering.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/40 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <strong className="text-sky-300 font-bold">BLUE ALERT (&lt;85%)</strong>
                  </div>
                  <p className="text-white/60 text-[10px]">Safe regulated live storage with full capacity buffering buffer.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsLineInfoModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#00B4D8] hover:bg-[#00B4D8]/90 text-black font-extrabold text-[12px] transition-all cursor-pointer mt-2 shadow-lg shadow-[#00B4D8]/20"
            >
              Close Color Matrix
            </button>
          </div>
        </div>
      )}

      {/* ─── FIXED MODAL: Dataset & Methodology Info Modal ─────────────────── */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#0D1321] border border-white/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-white relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#00B4D8] font-extrabold text-[15px]">
                <Info className="w-5 h-5" /> Hydrodynamic &amp; CWC Dam Telemetry Methodology
              </div>
              <button onClick={() => setIsInfoModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-[12px] text-white/80 leading-relaxed max-h-96 overflow-y-auto pr-1">
              <p>
                <strong className="text-white">Urban Drainage Surveys:</strong> Covers storm water drain conduits across municipal corporation zones (Greater Chennai Corporation GCC, BBMP Bangalore, BMC Mumbai, GHMC Hyderabad, PMC Pune) with cross-sectional depth, width, construction material, and open/closed slab status.
              </p>
              <p>
                <strong className="text-white">Municipal Sewerage Networks:</strong> Sewage Pumping Stations (SPS), Treatment Plants (STP), and trunk sewer mains sourced from CMWSSB, BWSSB, HMWSSB, and PMC water supply boards.
              </p>

              {/* Dam data source note */}
              <div className="p-3 rounded-xl border border-cyan-500/40 bg-cyan-950/30 space-y-1.5">
                <p className="text-cyan-300 font-bold text-[11px] uppercase tracking-wide">🌊 Dam &amp; Reservoir Telemetry Architecture</p>
                <p className="text-[11px] text-white/80 leading-relaxed">
                  <strong className="text-white">Geographic locations, Full Reservoir Levels (FRL in ft &amp; m MSL), live storage in TMC/Mcft, and radial gate specifications</strong> are calibrated with published records from:
                </p>
                <ul className="space-y-1 text-[11px] text-white/70">
                  <li>• <strong className="text-white">Central Water Commission (CWC)</strong> — India-WRIS Hydrological Information System &amp; NWIC</li>
                  <li>• <strong className="text-white">Tamil Nadu WRD</strong> — Chembarambakkam, Poondi, Red Hills, Cholavaram, Thervoy Kandigai &amp; Veeranam</li>
                  <li>• <strong className="text-white">Maharashtra WRD &amp; MCGM</strong> — Bhatsa, Middle Vaitarna, Tansa, Tulsi, Vihar, Khadakwasla, Panshet &amp; Varasgaon</li>
                  <li>• <strong className="text-white">Cauvery Neeravari Nigama (CNNL)</strong> — KRS Dam &amp; Kabini Reservoir telemetry stations</li>
                  <li>• <strong className="text-white">HMWSSB / Telangana Irrigation</strong> — Osman Sagar &amp; Himayat Sagar gate registers</li>
                </ul>
              </div>

              <p>
                <strong className="text-white">FABDEM 30m Digital Elevation Model:</strong> Forest and Buildings Removed Copernicus DEM — used for bare-earth ground elevation and slope modeling to calculate hydrodynamic backflow risks.
              </p>
              <p>
                <strong className="text-white">Downstream Inundation Corridors:</strong> Derived from National Disaster Management Authority (NDMA) Urban Flood Risk Atlases and hydrodynamic 1D/2D hydraulic flood routing models.
              </p>
            </div>

            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold transition-all cursor-pointer"
            >
              Close Dialog
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default DrainageNetworkPanel;
