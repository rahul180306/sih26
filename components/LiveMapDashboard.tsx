'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  X,
  Search,
  LayoutGrid,
  CloudRain,
  Waves,
  Route as RouteIcon,
  GitFork,
  Bell,
  Navigation as NavIcon,
  BarChart3,
  Settings,
  Info,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  Droplets,
  Shield,
  ArrowRight,
  Globe,
  MapPin,
  Compass,
  Layers,
  Sparkles,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { DataSourceFabricModal } from './DataSourceFabricModal';
import { SafeRoutePlanner } from './SafeRoutePlanner';
import { LeafletRouteMap } from './LeafletRouteMap';
import { RouteAlternativeItem } from '@/app/api/routing/directions/route';
import { RainfallSnapshot } from '@/lib/rainfall/types';
import { FloodRouteComparison } from '@/lib/routing/types';
import {
  calculateFloodSafeRoute,
  CITY_EMERGENCY_HUBS,
} from '@/lib/routing/engine';
import {
  CITIES_DATA,
  STATES_DATA,
  INDIA_BOUNDS,
  INDIA_CENTER,
  INDIA_ZOOM,
  NATIONAL_HIGHLIGHT_CITIES,
  INDIA_BOUNDARY_GEOJSON,
  STATE_BOUNDARIES_GEOJSON,
  DeploymentCity,
} from '@/lib/geoData';

interface LiveMapDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type DrillDownLevel = 'india' | 'state' | 'city';

export const LiveMapDashboard: React.FC<LiveMapDashboardProps> = ({ isOpen, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<any[]>([]);

  // Progressive Geographic Drill-down State (Starts at India Overview with no default city preselected)
  const [drillLevel, setDrillLevel] = useState<DrillDownLevel>('india');
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedCatchmentId, setSelectedCatchmentId] = useState<string | null>(null);

  // UI State
  const [activeNav, setActiveNav] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const storedTab = localStorage.getItem('jalrakshak_active_tab');
      if (tabParam) return tabParam;
      if (storedTab) return storedTab;
    }
    return 'Overview';
  });

  const [activeLayer, setActiveLayer] = useState<'depth' | 'flow' | 'rainfall' | 'roads' | 'terrain'>('depth');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
  const [rainfallSnapshot, setRainfallSnapshot] = useState<RainfallSnapshot | null>(null);
  const [nasaTelemetry, setNasaTelemetry] = useState<{
    authenticated: boolean;
    granuleId?: string;
    precipitationRate?: number;
    accumulated6hr?: number;
    probability?: number;
    confidenceLevel?: string;
    cellStatus?: string;
    lastAcquisition?: string;
  } | null>(null);

  // Safe Routing Engine State
  const [routeComparison, setRouteComparison] = useState<FloodRouteComparison>(() => {
    return calculateFloodSafeRoute('mumbai', 'mumbai-bkc', 'mumbai-kem', 'ambulance');
  });
  const [activeRouteView, setActiveRouteView] = useState<'safe' | 'inundated' | 'both'>('both');
  const [isSimulating, setIsSimulating] = useState(false);
  const [mapBaseTheme, setMapBaseTheme] = useState<'streets' | 'dark'>('streets');
  const routeMarkersRef = useRef<any[]>([]);
  const simMarkerRef = useRef<any>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Holds live ORS routes so the sync useEffect doesn't overwrite them with static data
  const liveOrsRoutesRef = useRef<{ primary: number[][], alt: number[][] } | null>(null);

  // Full-Screen Leaflet Background Map State for Routes Page
  const [leafletRoutes, setLeafletRoutes] = useState<RouteAlternativeItem[]>([]);
  const [selectedLeafletRouteIdx, setSelectedLeafletRouteIdx] = useState<number>(0);
  const [leafletOrigin, setLeafletOrigin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [leafletDest, setLeafletDest] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [isLeafletLoading, setIsLeafletLoading] = useState<boolean>(false);
  const [leafletError, setLeafletError] = useState<string | null>(null);

  // Active City Data
  const currentCityData = useMemo<DeploymentCity>(() => {
    if (selectedCityId && CITIES_DATA[selectedCityId]) {
      return CITIES_DATA[selectedCityId];
    }
    return CITIES_DATA['mumbai'];
  }, [selectedCityId]);

  // Update Route Comparison whenever active city changes
  useEffect(() => {
    const activeId = selectedCityId || 'mumbai';
    const hubs = CITY_EMERGENCY_HUBS[activeId] || CITY_EMERGENCY_HUBS['mumbai'];
    const origin = hubs[0]?.id || 'mumbai-bkc';
    const dest = hubs[1]?.id || 'mumbai-kem';
    setRouteComparison(calculateFloodSafeRoute(activeId, origin, dest, routeComparison.vehicle.id));
  }, [selectedCityId]);

  // Fetch Normalized Multi-Provider Rainfall Snapshot
  useEffect(() => {
    let isCancelled = false;
    const fetchRainfall = async () => {
      try {
        const res = await fetch(`/api/rainfall/current?city=${encodeURIComponent(currentCityData.id)}&lat=${currentCityData.lat}&lng=${currentCityData.lng}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!isCancelled && json.status === 'success') {
          setRainfallSnapshot(json.data);
        }
      } catch {
        // Fallback gracefully
      }
    };

    fetchRainfall();
    const interval = setInterval(fetchRainfall, 30000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [currentCityData]);

  // Fetch real-time NASA Earthdata GPM IMERG telemetry from server-side proxy

  // Fetch real-time NASA Earthdata GPM IMERG telemetry from server-side proxy
  useEffect(() => {
    let isCancelled = false;
    const fetchNasaStream = async () => {
      try {
        const res = await fetch(`/api/rainfall/gpm?city=${encodeURIComponent(currentCityData.id)}&lat=${currentCityData.lat}&lng=${currentCityData.lng}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isCancelled && data.status === 'success') {
          setNasaTelemetry({
            authenticated: data.auth?.authenticated || false,
            granuleId: data.granule?.id,
            precipitationRate: data.telemetry?.precipitationRate_mm_hr,
            accumulated6hr: data.telemetry?.accumulated6hr_mm,
            probability: data.telemetry?.precipitationProbability_pct,
            confidenceLevel: data.telemetry?.confidenceLevel,
            cellStatus: data.telemetry?.cellStatus,
            lastAcquisition: data.telemetry?.lastAcquisition,
          });
        }
      } catch {
        // Handled silently
      }
    };

    fetchNasaStream();
    const interval = setInterval(fetchNasaStream, 45000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [currentCityData]);

  // Active Catchment Data (Only returns a catchment if explicitly selected by the user)
  const currentCatchment = useMemo(() => {
    if (!selectedCatchmentId || !currentCityData.catchments || currentCityData.catchments.length === 0) return null;
    return currentCityData.catchments.find(c => c.id === selectedCatchmentId) || null;
  }, [currentCityData, selectedCatchmentId]);

  const handleNavSelect = (label: string) => {
    setActiveNav(label);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jalrakshak_active_tab', label);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', label);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Clear existing DOM markers safely
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
  }, []);

  // Clear existing route markers safely
  const clearRouteMarkers = useCallback(() => {
    routeMarkersRef.current.forEach(marker => marker.remove());
    routeMarkersRef.current = [];
    if (simMarkerRef.current) {
      simMarkerRef.current.remove();
      simMarkerRef.current = null;
    }
  }, []);

  // Stable callback: fly to route origin on MapLibre background (non-Routes tabs)
  const handleFlyToRouteOrigin = useCallback((lat: number, lng: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo({
      center: [lng, lat],
      zoom: 14.5,
      pitch: 55,
      bearing: -15,
      duration: 900,
      essential: true,
    });
  }, []);

  // Stable callback: receive routes from SafeRoutePlanner and push to Leaflet state
  const handleRealMultipleRoutes = useCallback((
    routes: RouteAlternativeItem[],
    selectedIdx: number,
    origin?: { lat: number; lng: number; label: string } | null,
    dest?: { lat: number; lng: number; label: string } | null,
    loading?: boolean,
    err?: string | null
  ) => {
    setLeafletRoutes(routes);
    setSelectedLeafletRouteIdx(selectedIdx);
    setLeafletOrigin(origin ?? null);
    setLeafletDest(dest ?? null);
    if (loading !== undefined) setIsLeafletLoading(loading);
    if (err !== undefined) setLeafletError(err);
  }, []);

  // Handle Simulation Toggle
  const handleToggleSimulation = useCallback(() => {
    if (isSimulating) {
      setIsSimulating(false);
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      if (simMarkerRef.current) {
        simMarkerRef.current.remove();
        simMarkerRef.current = null;
      }
    } else {
      setIsSimulating(true);
    }
  }, [isSimulating]);

  // Drilldown Navigation Handlers
  const drillToIndia = useCallback(() => {
    setDrillLevel('india');
    setSelectedStateId(null);
    setSelectedCityId(null);
    setSelectedCatchmentId(null);
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: INDIA_CENTER,
      zoom: INDIA_ZOOM,
      pitch: 0,
      bearing: 0,
      duration: 1600,
    });
  }, []);

  const drillToState = useCallback((stateId: string) => {
    const state = STATES_DATA[stateId];
    if (!state) return;
    setSelectedStateId(stateId);
    setDrillLevel('state');
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: state.center,
      zoom: state.zoom,
      pitch: 20,
      bearing: 0,
      duration: 1500,
    });
  }, []);

  const drillToCity = useCallback((cityId: string, catchmentId?: string) => {
    const city = CITIES_DATA[cityId];
    if (!city) return;
    setSelectedCityId(cityId);
    setSelectedStateId(city.stateId);
    setSelectedCatchmentId(catchmentId || null);
    setDrillLevel('city');

    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: [city.lng, city.lat],
      zoom: 12.4,
      pitch: 45,
      bearing: -12,
      duration: 1800,
    });
  }, []);

  const drillToCatchment = useCallback((catchment: DeploymentCity['catchments'][0]) => {
    setSelectedCatchmentId(catchment.id);
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: [catchment.lng, catchment.lat],
      zoom: 14.2,
      pitch: 50,
      bearing: -15,
      duration: 1200,
    });
  }, []);

  // Trigger map resize smoothly when sidebar collapses or expands OR activeNav changes
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.resize();
    }, 150);
    return () => clearTimeout(timer);
  }, [isSidebarCollapsed, activeNav]);

  // Synchronize Map Base Theme (OpenStreetMap / Carto Voyager vs Dark Twin)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer('osm-streets-layer')) {
      map.setLayoutProperty('osm-streets-layer', 'visibility', mapBaseTheme === 'streets' ? 'visible' : 'none');
    }
    if (map.getLayer('carto-dark-layer')) {
      map.setLayoutProperty('carto-dark-layer', 'visibility', mapBaseTheme === 'dark' ? 'visible' : 'none');
    }
  }, [mapBaseTheme]);

  // Handle Refresh simulation
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  };

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const matches: { type: 'city' | 'catchment' | 'state'; title: string; subtitle: string; id: string; parentId?: string }[] = [];

    // Check states
    Object.values(STATES_DATA).forEach(st => {
      if (st.name.toLowerCase().includes(q)) {
        matches.push({ type: 'state', title: st.name, subtitle: `State (${st.code}) · Indian Territory`, id: st.id });
      }
    });

    // Check cities
    Object.values(CITIES_DATA).forEach(c => {
      if (c.name.toLowerCase().includes(q) || c.stateName.toLowerCase().includes(q)) {
        matches.push({ type: 'city', title: c.name, subtitle: `${c.statusLabel} · ${c.stateName}`, id: c.id, parentId: c.stateId });
      }
      // Check catchments
      c.catchments?.forEach(cat => {
        if (cat.name.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q)) {
          matches.push({
            type: 'catchment',
            title: cat.name,
            subtitle: `Catchment in ${c.name} · Depth ${cat.depth}`,
            id: cat.id,
            parentId: c.id,
          });
        }
      });
    });

    return matches;
  }, [searchQuery]);

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.resize();
      return;
    }

    let isMounted = true;

    (async () => {
      const maplibregl = await import('maplibre-gl');
      if (!isMounted || !mapContainerRef.current) return;

      // Dual Tile Layer: OpenStreetMap / Carto Voyager (Clean road map) + Dark Twin
      const mapStyle = {
        version: 8 as const,
        sources: {
          'osm-streets': {
            type: 'raster' as const,
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, © CARTO, OpenRouteService',
          },
          'carto-dark': {
            type: 'raster' as const,
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap, © CARTO, JalRakshak Digital Twin',
          },
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster' as const,
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 20,
            layout: {
              visibility: 'visible' as const,
            },
          },
          {
            id: 'osm-streets-layer',
            type: 'raster' as const,
            source: 'osm-streets',
            minzoom: 0,
            maxzoom: 20,
            layout: {
              visibility: 'none' as const,
            },
          },
        ],
      };

      const initialCenter: [number, number] = INDIA_CENTER;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: initialCenter,
        zoom: INDIA_ZOOM,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
        maxBounds: [
          [62.0, 5.0], // SW Indian Ocean boundary
          [100.0, 38.0], // NE Himalayan boundary
        ],
      });

      map.on('load', () => {
        if (!isMounted) return;

        // 1. India Boundary Layer
        map.addSource('india-boundary', {
          type: 'geojson',
          data: INDIA_BOUNDARY_GEOJSON,
        });

        map.addLayer({
          id: 'india-boundary-glow',
          type: 'line',
          source: 'india-boundary',
          paint: {
            'line-color': '#F56A00',
            'line-width': 4,
            'line-opacity': 0.5,
            'line-blur': 3,
          },
        });

        map.addLayer({
          id: 'india-boundary-line',
          type: 'line',
          source: 'india-boundary',
          paint: {
            'line-color': '#F56A00',
            'line-width': 1.5,
            'line-opacity': 0.9,
          },
        });

        // 2. State Boundaries Layer
        map.addSource('state-boundaries', {
          type: 'geojson',
          data: STATE_BOUNDARIES_GEOJSON,
        });

        map.addLayer({
          id: 'state-fill',
          type: 'fill',
          source: 'state-boundaries',
          paint: {
            'fill-color': '#38BDF8',
            'fill-opacity': 0.04,
          },
        });

        map.addLayer({
          id: 'state-outline',
          type: 'line',
          source: 'state-boundaries',
          paint: {
            'line-color': '#38BDF8',
            'line-width': 1.2,
            'line-opacity': 0.45,
            'line-dasharray': [3, 2],
          },
        });

        // 3. Dynamic City Drainage Network Source
        map.addSource('city-drainage-grid', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: CITIES_DATA.mumbai.drainageNetwork.map(dn => ({
              type: 'Feature',
              properties: { name: dn.name, status: dn.status },
              geometry: {
                type: 'LineString',
                coordinates: dn.coordinates,
              },
            })),
          },
        });

        map.addLayer({
          id: 'drainage-lines-glow',
          type: 'line',
          source: 'city-drainage-grid',
          paint: {
            'line-color': '#06B6D4',
            'line-width': 8,
            'line-opacity': 0.4,
            'line-blur': 4,
          },
        });

        map.addLayer({
          id: 'drainage-lines',
          type: 'line',
          source: 'city-drainage-grid',
          paint: {
            'line-color': '#38BDF8',
            'line-width': 3.5,
            'line-opacity': 0.9,
            'line-dasharray': [2, 2],
          },
        });

        // 4. Dynamic Flood Inundation Polygon Source
        map.addSource('city-flood-polygons', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: CITIES_DATA.mumbai.floodPolygons.map(fp => ({
              type: 'Feature',
              properties: { depth: fp.depth, color: fp.color },
              geometry: {
                type: 'Polygon',
                coordinates: fp.coordinates,
              },
            })),
          },
        });

        map.addLayer({
          id: 'flood-fill',
          type: 'fill',
          source: 'city-flood-polygons',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.48,
          },
        });

        map.addLayer({
          id: 'flood-outline',
          type: 'line',
          source: 'city-flood-polygons',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': 0.85,
          },
        });

        // 5. Multi-Route Sources for Full-Screen Background Map (🟢 Safest, 🟡 Moderate, 🔴 High-Risk)
        [0, 1, 2].forEach((idx) => {
          const colors = ['#10B981', '#F59E0B', '#EF4444'];
          const srcId = `route-alt-${idx}-source`;

          map.addSource(srcId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [],
              },
            },
          });

          // Outer White Casing Underlay
          map.addLayer({
            id: `route-alt-${idx}-casing`,
            type: 'line',
            source: srcId,
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#ffffff',
              'line-width': 10,
              'line-opacity': 0.95,
            },
          });

          // Main Colored Route Line
          map.addLayer({
            id: `route-alt-${idx}-line`,
            type: 'line',
            source: srcId,
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': colors[idx],
              'line-width': idx === 0 ? 7 : 5,
              'line-opacity': 1.0,
            },
          });
        });

        // Backward compatibility sources
        map.addSource('route-safe-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeComparison.jalrakshakSafeRoute.coordinates,
            },
          },
        });
        map.addSource('route-inundated-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeComparison.standardInundatedRoute.coordinates,
            },
          },
        });

        mapInstanceRef.current = map;
      });
    })();

    return () => {
      isMounted = false;
      clearMarkers();
      clearRouteMarkers();
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, clearMarkers]);

  // Update Map Sources & Markers when drillLevel or selectedCity changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // 1. Update GeoJSON sources for the active city
    const drainageSource = map.getSource('city-drainage-grid') as any;
    if (drainageSource && currentCityData.drainageNetwork) {
      drainageSource.setData({
        type: 'FeatureCollection',
        features: currentCityData.drainageNetwork.map(dn => ({
          type: 'Feature',
          properties: { name: dn.name, status: dn.status },
          geometry: {
            type: 'LineString',
            coordinates: dn.coordinates,
          },
        })),
      });
    }

    const floodSource = map.getSource('city-flood-polygons') as any;
    if (floodSource && currentCityData.floodPolygons) {
      floodSource.setData({
        type: 'FeatureCollection',
        features: currentCityData.floodPolygons.map(fp => ({
          type: 'Feature',
          properties: { depth: fp.depth, color: fp.color },
          geometry: {
            type: 'Polygon',
            coordinates: fp.coordinates,
          },
        })),
      });
    }

    // 2. Refresh DOM Markers based on drill level
    clearMarkers();

    (async () => {
      const maplibregl = await import('maplibre-gl');

      if (drillLevel === 'india') {
        // LEVEL 0: INDIA OVERVIEW
        // Display only national highlight cities with deployment status rings
        NATIONAL_HIGHLIGHT_CITIES.forEach(cityKey => {
          const city = CITIES_DATA[cityKey];
          if (!city) return;

          const isPrimary = city.type === 'primary';
          const el = document.createElement('div');
          el.className = 'cursor-pointer group select-none';
          el.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; position: relative;">
              <!-- Outer pulse ring -->
              <div style="
                position: relative;
                width: ${isPrimary ? '46px' : '36px'};
                height: ${isPrimary ? '46px' : '36px'};
                border-radius: 50%;
                background: ${isPrimary ? '#10B98125' : '#F59E0B20'};
                border: 2px solid ${isPrimary ? '#10B981' : '#F59E0B'};
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 ${isPrimary ? '20px #10B981' : '14px #F59E0B88'};
                transition: transform 0.25s ease;
              ">
                <div style="
                  width: ${isPrimary ? '16px' : '12px'};
                  height: ${isPrimary ? '16px' : '12px'};
                  border-radius: 50%;
                  background: ${isPrimary ? '#10B981' : '#F59E0B'};
                  box-shadow: 0 0 10px #ffffff;
                "></div>
              </div>

              <!-- Status Tag Badge -->
              <div style="
                margin-top: 6px;
                background: rgba(13, 18, 28, 0.94);
                border: 1px solid ${isPrimary ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.15)'};
                border-radius: 8px;
                padding: 3px 8px;
                text-align: center;
                white-space: nowrap;
                box-shadow: 0 4px 16px rgba(0,0,0,0.6);
                backdrop-filter: blur(8px);
              ">
                <div style="font-size: 11px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">
                  ${city.name.split(' ')[0]}
                </div>
                <div style="font-size: 8px; font-weight: 800; color: ${isPrimary ? '#34D399' : '#FBBF24'}; text-transform: uppercase; letter-spacing: 0.08em;">
                  ${isPrimary ? '● PRIMARY' : '○ DEMO DATA'}
                </div>
              </div>
            </div>
          `;

          el.addEventListener('click', () => {
            drillToCity(cityKey);
          });

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([city.lng, city.lat])
            .addTo(map);

          markersRef.current.push(marker);
        });

      } else if (drillLevel === 'state' && selectedStateId) {
        // LEVEL 1: STATE VIEW
        // Show cities belonging to selected state with calibration availability badges
        const state = STATES_DATA[selectedStateId];
        if (state) {
          state.cities.forEach((cityKey: string) => {
            const city = CITIES_DATA[cityKey];
            if (!city) return;

            const isPrimary = city.type === 'primary';
            const isUnconfigured = city.type === 'unconfigured';
            const el = document.createElement('div');
            el.className = 'cursor-pointer group select-none';

            el.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; position: relative;">
                <div style="
                  width: ${isPrimary ? '42px' : '32px'};
                  height: ${isPrimary ? '42px' : '32px'};
                  border-radius: 50%;
                  background: ${isPrimary ? '#10B98125' : isUnconfigured ? '#4B556325' : '#F59E0B20'};
                  border: 2px solid ${isPrimary ? '#10B981' : isUnconfigured ? '#6B7280' : '#F59E0B'};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 0 14px ${isPrimary ? '#10B981' : isUnconfigured ? '#6B728040' : '#F59E0B66'};
                ">
                  <div style="
                    width: ${isPrimary ? '14px' : '10px'};
                    height: ${isPrimary ? '14px' : '10px'};
                    border-radius: 50%;
                    background: ${isPrimary ? '#10B981' : isUnconfigured ? '#9CA3AF' : '#F59E0B'};
                  "></div>
                </div>

                <div style="
                  margin-top: 5px;
                  background: rgba(13, 18, 28, 0.95);
                  border: 1px solid ${isPrimary ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.12)'};
                  border-radius: 8px;
                  padding: 3px 8px;
                  text-align: center;
                  white-space: nowrap;
                  box-shadow: 0 4px 14px rgba(0,0,0,0.6);
                ">
                  <div style="font-size: 11px; font-weight: 800; color: #ffffff;">
                    ${city.name}
                  </div>
                  <div style="font-size: 8.5px; font-weight: 700; color: ${isPrimary ? '#34D399' : isUnconfigured ? '#9CA3AF' : '#FBBF24'};">
                    ${isPrimary ? '● PRIMARY CATCHMENT' : isUnconfigured ? '○ NOT CONFIGURED' : '○ DEMO DATA'}
                  </div>
                </div>
              </div>
            `;

            el.addEventListener('click', () => {
              if (city.catchments && city.catchments.length > 0) {
                drillToCity(cityKey);
              } else {
                drillToCity(cityKey);
              }
            });

            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([city.lng, city.lat])
              .addTo(map);

            markersRef.current.push(marker);
          });
        }

      } else if (drillLevel === 'city') {
        // LEVEL 2: CITY / CATCHMENT DIGITAL TWIN
        // Display precise catchment hazard pins and flood depth gauges
        if (currentCityData.catchments && currentCityData.catchments.length > 0) {
          currentCityData.catchments.forEach(zone => {
            const isSelected = zone.id === selectedCatchmentId;
            const el = document.createElement('div');
            el.className = 'cursor-pointer group select-none';
            el.innerHTML = `
              <div style="
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                transform: ${isSelected ? 'scale(1.12)' : 'scale(1)'};
                transition: all 0.2s ease;
              ">
                <div style="
                  width: ${isSelected ? '44px' : '36px'};
                  height: ${isSelected ? '44px' : '36px'};
                  border-radius: 50%;
                  background: ${zone.riskColor}28;
                  border: 2px solid ${zone.riskColor};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 0 ${isSelected ? '22px' : '14px'} ${zone.riskColor}77;
                ">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${zone.riskColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>

                <div style="
                  margin-top: 4px;
                  background: rgba(13, 18, 28, 0.96);
                  border: 1px solid ${isSelected ? '#F56A00' : 'rgba(255,255,255,0.15)'};
                  border-radius: 6px;
                  padding: 2px 7px;
                  font-size: 10px;
                  font-weight: 800;
                  color: #ffffff;
                  white-space: nowrap;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                ">
                  ${zone.name.split(' ')[0]} ${zone.depth}
                </div>
              </div>
            `;

            el.addEventListener('click', () => {
              drillToCatchment(zone);
            });

            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([zone.lng, zone.lat])
              .addTo(map);

            markersRef.current.push(marker);
          });
        }
      }
    })();
  }, [drillLevel, selectedCityId, selectedStateId, selectedCatchmentId, currentCityData, clearMarkers, drillToCatchment, drillToCity]);

  // Synchronize Safe Routing Engine GeoJSON Layers, Pins & Live Simulation on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // 1. Update Route GeoJSON Source Data
    // Only use static simulated data if no live ORS routes have been loaded yet
    const live = liveOrsRoutesRef.current;
    const safeSource = map.getSource('route-safe-source') as any;
    if (safeSource) {
      safeSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: live ? live.primary : routeComparison.jalrakshakSafeRoute.coordinates,
        },
      });
    }

    const inundatedSource = map.getSource('route-inundated-source') as any;
    if (inundatedSource) {
      inundatedSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: live ? live.alt : routeComparison.standardInundatedRoute.coordinates,
        },
      });
    }

    // 2. Control Layer Visibility based on active tab and route view
    const isRouteMode = activeNav === 'Routes';
    const showSafe = isRouteMode && (activeRouteView === 'safe' || activeRouteView === 'both');
    const showInundated = isRouteMode && (activeRouteView === 'inundated' || activeRouteView === 'both');

    // Keep the original dark digital twin for all other sections, and streets for Routes
    if (map.getLayer('carto-dark-layer')) {
      map.setLayoutProperty('carto-dark-layer', 'visibility', isRouteMode ? 'none' : 'visible');
    }
    if (map.getLayer('osm-streets-layer')) {
      map.setLayoutProperty('osm-streets-layer', 'visibility', isRouteMode ? 'visible' : 'none');
    }

    if (map.getLayer('route-safe-line')) {
      map.setLayoutProperty('route-safe-line', 'visibility', showSafe ? 'visible' : 'none');
    }
    if (map.getLayer('route-safe-casing')) {
      map.setLayoutProperty('route-safe-casing', 'visibility', showSafe ? 'visible' : 'none');
    }
    if (map.getLayer('route-inundated-line')) {
      map.setLayoutProperty('route-inundated-line', 'visibility', showInundated ? 'visible' : 'none');
    }
    if (map.getLayer('route-inundated-casing')) {
      map.setLayoutProperty('route-inundated-casing', 'visibility', showInundated ? 'visible' : 'none');
    }

    // 3. Clear old route markers and re-create if in Routes tab
    clearRouteMarkers();

    if (!isRouteMode) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      return;
    }

    (async () => {
      const maplibregl = await import('maplibre-gl');

      const origin = routeComparison.origin;
      const destination = routeComparison.destination;

      // Origin Marker (Google Blue concentric dot with white ring)
      const originEl = document.createElement('div');
      originEl.className = 'select-none cursor-pointer';
      originEl.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="
            width: 26px; height: 26px; border-radius: 50%;
            background: #1A73E8; border: 3.5px solid #ffffff;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 14px rgba(26, 115, 232, 0.6), 0 2px 6px rgba(0,0,0,0.3);
          ">
            <div style="width: 7px; height: 7px; border-radius: 50%; background: #ffffff;"></div>
          </div>
          <div style="
            margin-top: 3px; background: #ffffff;
            border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 2px 7px; font-size: 10px; font-weight: 800; color: #1e293b;
            white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          ">
            📍 ${origin.name.split(' ')[0]}
          </div>
        </div>
      `;
      const originMarker = new maplibregl.Marker({ element: originEl })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map);
      routeMarkersRef.current.push(originMarker);

      // Destination Marker (Google Red Destination Pin)
      const destEl = document.createElement('div');
      destEl.className = 'select-none cursor-pointer';
      destEl.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="
            width: 32px; height: 32px;
            display: flex; align-items: center; justify-content: center;
            filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));
          ">
            <svg width="28" height="34" viewBox="0 0 24 24" fill="#EA4335" stroke="#ffffff" stroke-width="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div style="
            margin-top: -2px; background: #ffffff;
            border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 2px 7px; font-size: 10px; font-weight: 800; color: #1e293b;
            white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          ">
            🏁 ${destination.name.split(' ')[0]}
          </div>
        </div>
      `;
      const destMarker = new maplibregl.Marker({ element: destEl })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);
      routeMarkersRef.current.push(destMarker);

      // Hazard Markers on Inundated Route
      if (showInundated && routeComparison.standardInundatedRoute.hazards) {
        routeComparison.standardInundatedRoute.hazards.forEach(hazard => {
          const hEl = document.createElement('div');
          hEl.className = 'select-none';
          hEl.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center;">
              <div style="
                width: 28px; height: 28px; border-radius: 50%;
                background: #DC2626; border: 2.5px solid #ffffff;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 12px rgba(220, 38, 38, 0.6);
                font-size: 12px; color: #ffffff; font-weight: 900;
              ">
                ⚠️
              </div>
              <div style="
                margin-top: 2px; background: #ffffff;
                border: 1px solid #fee2e2; border-radius: 6px;
                padding: 1px 6px; font-size: 9px; font-weight: 800; color: #dc2626;
                white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.12);
              ">
                ${hazard.name.split(' ')[0]} ${hazard.predictedDepthMeters}m
              </div>
            </div>
          `;
          const hMarker = new maplibregl.Marker({ element: hEl })
            .setLngLat([hazard.lng, hazard.lat])
            .addTo(map);
          routeMarkersRef.current.push(hMarker);
        });
      }

      // 3b. Interactive Google Maps Style Route Callout Chips on the Map Path
      const safeCoords = routeComparison.jalrakshakSafeRoute.coordinates;
      const midSafeIdx = Math.floor(safeCoords.length / 2);
      if (showSafe && safeCoords[midSafeIdx]) {
        const safeChipEl = document.createElement('div');
        safeChipEl.className = 'select-none cursor-pointer transform hover:scale-110 transition-transform';
        safeChipEl.innerHTML = `
          <div style="
            background: #ffffff; color: #0f172a; padding: 5px 12px; border-radius: 24px;
            font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06);
          ">
            <span style="color: #059669; font-weight: 900;">🟢 ${routeComparison.jalrakshakSafeRoute.durationMin} min</span>
            <span style="color: #64748b; font-size: 10px; font-weight: 700;">Fastest flood-free</span>
          </div>
        `;
        safeChipEl.addEventListener('click', () => {
          setActiveRouteView('safe');
        });
        const safeChipMarker = new maplibregl.Marker({ element: safeChipEl })
          .setLngLat(safeCoords[midSafeIdx])
          .addTo(map);
        routeMarkersRef.current.push(safeChipMarker);
      }

      const inunCoords = routeComparison.standardInundatedRoute.coordinates;
      const midInunIdx = Math.floor(inunCoords.length / 2);
      if (showInundated && inunCoords[midInunIdx]) {
        const inunChipEl = document.createElement('div');
        inunChipEl.className = 'select-none cursor-pointer transform hover:scale-110 transition-transform';
        inunChipEl.innerHTML = `
          <div style="
            background: #ffffff; color: #0f172a; padding: 5px 12px; border-radius: 24px;
            font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06);
          ">
            <span style="color: #dc2626; font-weight: 900;">⚡ ${routeComparison.standardInundatedRoute.durationMin} min</span>
            <span style="color: #dc2626; font-size: 10px; font-weight: 700;">${routeComparison.standardInundatedRoute.maxWaterDepthMeters}m ⚠️</span>
          </div>
        `;
        inunChipEl.addEventListener('click', () => {
          setActiveRouteView('inundated');
        });
        const inunChipMarker = new maplibregl.Marker({ element: inunChipEl })
          .setLngLat(inunCoords[midInunIdx])
          .addTo(map);
        routeMarkersRef.current.push(inunChipMarker);
      }

      // ── Google Maps 2-Step Camera ──────────────────────────────────────────
      // Step 1: Fly close to the ORIGIN point (like tapping a start pin)
      const routeOrigin = routeComparison.origin;
      map.flyTo({
        center: [routeOrigin.lng, routeOrigin.lat],
        zoom: 14.5,
        pitch: 55,
        bearing: -15,
        duration: 1200,
        essential: true,
      });

      // Step 2: After landing on origin, pull back to show the full route
      const allCoords = [
        ...routeComparison.jalrakshakSafeRoute.coordinates,
        ...routeComparison.standardInundatedRoute.coordinates,
      ];
      if (allCoords.length > 0) {
        const bounds = allCoords.reduce(
          (acc, c) => [
            [Math.min(acc[0][0], c[0]), Math.min(acc[0][1], c[1])],
            [Math.max(acc[1][0], c[0]), Math.max(acc[1][1], c[1])],
          ],
          [[allCoords[0][0], allCoords[0][1]], [allCoords[0][0], allCoords[0][1]]]
        );

        setTimeout(() => {
          if (!mapInstanceRef.current) return;
          mapInstanceRef.current.fitBounds(
            bounds as [[number, number], [number, number]],
            {
              padding: { top: 110, bottom: 70, left: 440, right: 70 },
              pitch: 42,
              bearing: -10,
              duration: 1600,
            }
          );
        }, 1350); // fires just after flyTo lands
      }

      // 4. Live Simulation Animation
      if (isSimulating && allCoords.length > 1) {
        let stepIdx = 0;
        const vehicleIcon = routeComparison.vehicle.id === 'ambulance' ? '🚑' : (routeComparison.vehicle.id === 'bus' ? '🚌' : (routeComparison.vehicle.id === 'bike' ? '🛵' : '🚗'));

        const vehicleEl = document.createElement('div');
        vehicleEl.className = 'select-none transition-all duration-300';
        vehicleEl.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="
              background: #F56A00; border: 2px solid #ffffff; border-radius: 50%;
              width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
              box-shadow: 0 0 20px #F56A00, 0 0 10px #ffffff; font-size: 18px;
            ">
              ${vehicleIcon}
            </div>
            <div style="
              margin-top: 3px; background: rgba(13, 18, 28, 0.96); border: 1px solid #F56A00;
              border-radius: 6px; padding: 2px 7px; font-size: 9px; font-weight: 800; color: #F56A00;
              white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.7);
            ">
              DISPATCH ACTIVE
            </div>
          </div>
        `;

        const animatedMarker = new maplibregl.Marker({ element: vehicleEl })
          .setLngLat(allCoords[0])
          .addTo(map);
        simMarkerRef.current = animatedMarker;

        if (simIntervalRef.current) clearInterval(simIntervalRef.current);
        simIntervalRef.current = setInterval(() => {
          stepIdx += 1;
          if (stepIdx >= allCoords.length - 1) {
            animatedMarker.setLngLat(allCoords[allCoords.length - 1]);
            if (simIntervalRef.current) {
              clearInterval(simIntervalRef.current);
              simIntervalRef.current = null;
            }
            return;
          }
          animatedMarker.setLngLat(allCoords[stepIdx]);
        }, 320);
      }
    })();
  }, [activeNav, activeRouteView, routeComparison, isSimulating, clearRouteMarkers]);

  // Zoom Controls
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };
  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };
  const handleRecenter = () => {
    if (drillLevel === 'india' || !selectedCityId) {
      drillToIndia();
    } else if (drillLevel === 'state' && selectedStateId) {
      drillToState(selectedStateId);
    } else if (selectedCityId) {
      drillToCity(selectedCityId, selectedCatchmentId || undefined);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#090D14] text-white flex overflow-hidden font-sans antialiased select-none">
      
      {/* ========================================================================= */}
      {/* LEFT SIDEBAR NAVIGATION                                                    */}
      {/* ========================================================================= */}
      <aside 
        className={`${
          isSidebarCollapsed ? 'w-[72px] p-3' : 'w-[240px] lg:w-[260px] p-4'
        } bg-[#0D121C] border-r border-white/10 flex flex-col justify-between shrink-0 z-30 transition-all duration-300 ease-in-out`}
      >
        
        {/* Brand Header */}
        <div>
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center flex-col gap-3 pb-4' : 'justify-between pb-5'} border-b border-white/10`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-[#F56A00] flex items-center justify-center text-white shadow-lg shadow-[#F56A00]/20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 2 L34 18 L18 34 L2 18 Z" />
                  <path d="M18 8 C14 14, 10 18, 18 28 C26 18, 22 14, 18 8 Z" fill="#F56A00" />
                </svg>
              </div>
              {!isSidebarCollapsed && (
                <div className="transition-opacity duration-200">
                  <span className="font-extrabold text-[15px] tracking-tight block text-white leading-none">
                    JALRAKSHAK
                  </span>
                  <span className="text-[9px] font-bold tracking-[0.25em] text-[#F56A00] uppercase">
                    URBAN FLOOD AI
                  </span>
                </div>
              )}
            </div>

            {/* Minimize / Expand Toggle Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all shadow-sm shrink-0 cursor-pointer"
              title={isSidebarCollapsed ? "Expand sidebar" : "Minimise sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Search Box */}
          <div className="mt-4 relative">
            <Search className={`w-4 h-4 text-white/40 absolute ${isSidebarCollapsed ? 'left-1/2 -translate-x-1/2' : 'left-3'} top-1/2 -translate-y-1/2`} />
            {!isSidebarCollapsed ? (
              <input
                type="text"
                placeholder="Search India, cities, catchments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141A26] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-[12px] text-white placeholder-white/40 focus:outline-none focus:border-[#F56A00]/60 transition-colors"
              />
            ) : (
              <div 
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-full h-9 bg-[#141A26] border border-white/10 rounded-xl cursor-pointer hover:border-white/30 transition-colors flex items-center justify-center"
                title="Search locations"
              />
            )}

            {/* Search Dropdown Results */}
            {searchResults && searchResults.length > 0 && !isSidebarCollapsed && (
              <div className="absolute left-0 right-0 top-11 bg-[#121824] border border-white/20 rounded-2xl shadow-2xl p-1 z-40 max-h-64 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery('');
                      if (item.type === 'state') {
                        drillToState(item.id);
                      } else if (item.type === 'city') {
                        drillToCity(item.id);
                      } else if (item.type === 'catchment') {
                        drillToCity(item.parentId || 'mumbai', item.id);
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 transition-colors flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="text-[12px] font-bold text-white flex items-center justify-between">
                      {item.title}
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                        {item.type}
                      </span>
                    </span>
                    <span className="text-[10px] text-white/50">{item.subtitle}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="mt-4 space-y-1">
            {[
              { label: 'Overview', icon: LayoutGrid },
              { label: 'Live Nowcast', icon: CloudRain },
              { label: 'Flood Map', icon: Waves },
              { label: 'Road Impact', icon: RouteIcon },
              { label: 'Drainage Network', icon: GitFork },
              { label: 'Alerts', icon: Bell, badge: 3 },
              { label: 'Routes', icon: NavIcon },
              { label: 'Reports', icon: BarChart3 },
              { label: 'Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavSelect(item.label)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'
                  } rounded-xl text-[13px] font-semibold transition-all cursor-pointer relative group ${
                    isActive
                      ? 'bg-gradient-to-r from-[#F56A00]/20 to-[#F56A00]/5 text-[#F56A00] border border-[#F56A00]/30 shadow-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#F56A00]' : 'text-white/60'}`} />
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </div>
                  {item.badge && !isSidebarCollapsed && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {item.badge && isSidebarCollapsed && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Status */}
        <div className="space-y-2 pt-4 border-t border-white/10">
          {!isSidebarCollapsed ? (
            <>
              <div className="p-2.5 rounded-xl bg-[#141A26] border border-white/10 flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <span className="text-[11px] font-bold text-white block leading-tight">National Network</span>
                  <span className="text-[10px] text-emerald-400 font-medium">18 Active Telemetry Nodes</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#141A26]/60 border border-white/5 text-white/70 text-[11px] flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">19:45 IST</span>
                  <span className="text-[10px] text-white/50">23 May 2025</span>
                </div>
                <div className="px-2 py-1 rounded-lg bg-white/5 text-[9px] font-mono text-white/60">
                  UTC+5:30
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" title="18 Active Telemetry Nodes" />
            </div>
          )}
        </div>

      </aside>

      {/* ========================================================================= */}
      {/* MAIN DASHBOARD CONTENT AREA                                               */}
      {/* ========================================================================= */}
      <div className={`flex-1 flex flex-col min-w-0 bg-[#090D14] ${activeNav === 'Routes' ? 'overflow-hidden h-screen' : 'overflow-y-auto'}`}>
        
        {/* Top Split Area (Map on Left/Center + Right Side Analytics Cards) */}
        <div className={activeNav === 'Routes' ? 'h-full w-full p-2 lg:p-3 flex-1 flex flex-col' : 'grid grid-cols-1 xl:grid-cols-12 gap-5 p-4 lg:p-6 pb-2 lg:pb-3'}>
          
          {/* ========================================================================= */}
          {/* MAP CANVAS CONTAINER (Full 12 cols / full height in Routes mode)          */}
          {/* ========================================================================= */}
          <div className={`${
            activeNav === 'Routes' 
              ? 'w-full h-full flex-1 min-h-[calc(100vh-32px)]' 
              : 'xl:col-span-8 h-[520px] lg:h-[600px] xl:h-[640px]'
          } bg-[#0D121C] border border-white/10 rounded-3xl overflow-hidden relative flex flex-col shadow-2xl transition-all duration-300`}>
            
            {/* Top Floating Overlay: Progressive Geographic Breadcrumbs */}
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
              
              {/* Progressive Geographic Breadcrumb Bar */}
              <div className="flex items-center gap-1.5 bg-[#121824]/95 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-2xl shadow-xl pointer-events-auto overflow-x-auto max-w-full">
                
                {/* Level 0: India */}
                <button
                  onClick={drillToIndia}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                    drillLevel === 'india'
                      ? 'bg-[#F56A00] text-white shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title="Zoom to India Overview"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>🇮🇳 India</span>
                </button>

                {/* Level 1: State (Visible only when selected) */}
                {selectedStateId && STATES_DATA[selectedStateId] && (
                  <>
                    <span className="text-white/30 text-[11px]">/</span>
                    <button
                      onClick={() => drillToState(selectedStateId)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                        drillLevel === 'state'
                          ? 'bg-[#F56A00] text-white shadow-md'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                      title={`Zoom to ${STATES_DATA[selectedStateId]?.name || 'State'}`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{STATES_DATA[selectedStateId]?.name}</span>
                    </button>
                  </>
                )}

                {/* Level 2: City (Visible only when selected) */}
                {selectedCityId && CITIES_DATA[selectedCityId] && (
                  <>
                    <span className="text-white/30 text-[11px]">/</span>
                    <button
                      onClick={() => drillToCity(selectedCityId)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                        drillLevel === 'city'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                      title={`View Operational Catchment for ${CITIES_DATA[selectedCityId].name}`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>{CITIES_DATA[selectedCityId].name}</span>
                    </button>
                  </>
                )}

                {/* Level 3: Catchment (Visible only when in city view and selected) */}
                {currentCatchment && drillLevel === 'city' && selectedCityId && (
                  <>
                    <span className="text-white/30 text-[11px]">/</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-cyan-300 text-[11px] font-mono font-bold whitespace-nowrap">
                      {currentCatchment.name}
                    </span>
                  </>
                )}
              </div>

              {/* Right Group: City Switcher & Exit Button */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <div className="relative">
                  <button
                    onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                    className="bg-[#121824]/90 backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-2xl flex items-center gap-2 text-[12px] font-bold text-white shadow-lg hover:border-white/30 transition-all cursor-pointer"
                  >
                    <span className={`w-2 h-2 rounded-full ${selectedCityId ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
                    <span>{selectedCityId && CITIES_DATA[selectedCityId] ? CITIES_DATA[selectedCityId].name : 'Select City Deployment'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/60" />
                  </button>

                  {isCityDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-[#121824] border border-white/20 rounded-2xl shadow-2xl py-1.5 z-40 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white/40 border-b border-white/10">
                        JalRakshak Deployments
                      </div>
                      {Object.values(CITIES_DATA).filter(c => c.type !== 'unconfigured').map((city) => (
                        <button
                          key={city.id}
                          onClick={() => {
                            drillToCity(city.id);
                            setIsCityDropdownOpen(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-[12px] hover:bg-white/10 font-semibold transition-colors flex items-center justify-between ${
                            city.id === selectedCityId ? 'text-[#F56A00] bg-white/5' : 'text-white/80'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-white">{city.name}</div>
                            <div className="text-[10px] text-white/50">{city.stateName}</div>
                          </div>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            city.type === 'primary' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {city.type === 'primary' ? 'PRIMARY' : 'DEMO'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="bg-[#121824]/90 hover:bg-red-500/20 backdrop-blur-md border border-white/15 hover:border-red-500/40 px-3 py-2 rounded-2xl flex items-center gap-1.5 text-[12px] font-bold text-white/80 hover:text-white shadow-lg transition-all cursor-pointer"
                  title="Exit Dashboard"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px]">Exit</span>
                </button>
              </div>

            </div>


            {/* Floating Dynamic Safe Route Planner Console OR Catchment Overlay */}
            {activeNav === 'Routes' ? (
              <div
                className="absolute top-16 left-4 z-30 pointer-events-auto max-h-[calc(100%-80px)] pb-4"
                style={{
                  overflowY: 'auto',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(148,163,184,0.35) transparent',
                  scrollBehavior: 'smooth',
                }}
              >
                <SafeRoutePlanner
                  cityId={selectedCityId || ''}
                  selectedRouteComparison={routeComparison}
                  onSelectRouteComparison={setRouteComparison}
                  activeRouteView={activeRouteView}
                  onSetActiveRouteView={setActiveRouteView}
                  isSimulating={isSimulating}
                  onToggleSimulation={handleToggleSimulation}
                  onFlyToOrigin={handleFlyToRouteOrigin}
                  onRealMultipleRoutes={handleRealMultipleRoutes}
                  onCityChange={(newCityId) => drillToCity(newCityId)}
                />
              </div>
            ) : (
              <>
                {/* Level Banner Status Pill */}
                <div className="absolute top-18 left-4 z-20 pointer-events-none">
                  <div className="bg-[#121824]/95 backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#F56A00]" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#F56A00] block leading-tight">
                        {drillLevel === 'india' && 'LEVEL 0 · NATIONAL RADAR OVERVIEW'}
                        {drillLevel === 'state' && selectedStateId && STATES_DATA[selectedStateId] && `LEVEL 1 · ${STATES_DATA[selectedStateId].name.toUpperCase()} REGIONAL GRID`}
                        {drillLevel === 'city' && `LEVEL 2 · ${currentCityData.name.toUpperCase()} DIGITAL TWIN`}
                      </span>
                      <span className="text-[12px] font-extrabold text-white">
                        {drillLevel === 'india' && '18 Active Monitoring Locations in India'}
                        {drillLevel === 'state' && selectedStateId && `${STATES_DATA[selectedStateId]?.name} · Click City to Open Catchment Twin`}
                        {drillLevel === 'city' && `${currentCityData.tag} · ${currentCatchment?.name || 'Catchment Grid'}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Catchment Selectors (Visible in City Level) */}
                {drillLevel === 'city' && currentCityData.catchments && currentCityData.catchments.length > 0 && (
                  <div className="absolute top-32 left-4 z-20 bg-[#121824]/95 backdrop-blur-md p-2 rounded-2xl border border-white/15 shadow-2xl pointer-events-auto max-w-[280px]">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/50 block px-2 mb-1.5">
                      Catchments ({currentCityData.name})
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {currentCityData.catchments.map((catchment) => (
                        <button
                          key={catchment.id}
                          onClick={() => drillToCatchment(catchment)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-between cursor-pointer ${
                            selectedCatchmentId === catchment.id
                              ? 'bg-[#F56A00] text-white shadow'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{catchment.name}</span>
                          <span className="font-mono text-[10px] ml-2 shrink-0">{catchment.depth}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Floating Left Legend (Shown in non-Routes mode) */}
                <div className="absolute bottom-16 left-4 z-20 bg-[#121824]/90 backdrop-blur-md border border-white/15 p-3 rounded-2xl shadow-xl pointer-events-auto">
                  <span className="text-[11px] font-bold text-white/70 block mb-2">Flood Inundation (m)</span>
                  <div className="space-y-1.5 text-[11px] font-medium text-white/80">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>&lt; 0.20 m (Safe)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <span>0.20 – 0.50 m (Low)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span>0.50 – 0.80 m (Medium)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span>&gt; 0.80 m (Critical)</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ========================================================================= */}
            {/* BACKGROUND MAP: Full-Screen Leaflet for Routes Page, MapLibre for Others */}
            {/* ========================================================================= */}
            <div className={`w-full h-full min-h-[480px] relative z-10 ${activeNav === 'Routes' ? 'hidden' : 'block'}`}>
              <div ref={mapContainerRef} className="w-full h-full min-h-[480px]" />
            </div>

            {activeNav === 'Routes' && (
              <div className="w-full h-full min-h-[480px] absolute inset-0 z-10">
                <LeafletRouteMap
                  cityId={selectedCityId || undefined}
                  origin={leafletOrigin}
                  destination={leafletDest}
                  routes={leafletRoutes}
                  selectedRouteIdx={selectedLeafletRouteIdx}
                  onSelectRouteIdx={(idx) => {
                    setSelectedLeafletRouteIdx(idx);
                  }}
                  isLoading={isLeafletLoading}
                  error={leafletError}
                  isSimulating={isSimulating}
                  vehicle={routeComparison?.vehicle?.id || 'car'}
                />
              </div>
            )}

            {/* Bottom Layer Switcher Pills (Hidden in Routes mode) */}
            {activeNav !== 'Routes' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#121824]/95 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 shadow-2xl pointer-events-auto">
                {[
                  { id: 'depth', label: 'Flood Depth', icon: Droplets },
                  { id: 'flow', label: 'Flow Velocity', icon: Waves },
                  { id: 'rainfall', label: 'Rainfall', icon: CloudRain },
                  { id: 'roads', label: 'Road Impact', icon: RouteIcon },
                  { id: 'terrain', label: 'Terrain & DEM', icon: Layers },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeLayer === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveLayer(tab.id as typeof activeLayer)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#F56A00] text-white shadow-md'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Floating Right Map Controls (Hidden in Routes mode) */}
            {activeNav !== 'Routes' && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-auto">
                <button
                  onClick={handleRefresh}
                  className="w-9 h-9 rounded-xl bg-[#121824]/90 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-all shadow-lg cursor-pointer"
                  title="Refresh Live Sensor Stream"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F56A00]' : ''}`} />
                </button>
                <button
                  onClick={handleRecenter}
                  className="w-9 h-9 rounded-xl bg-[#121824]/90 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-all shadow-lg cursor-pointer"
                  title="Recenter Current View"
                >
                  <Crosshair className="w-4 h-4" />
                </button>
                <div className="flex flex-col bg-[#121824]/90 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden shadow-lg">
                  <button
                    onClick={handleZoomIn}
                    className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-all border-b border-white/10 cursor-pointer"
                    title="Zoom In"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
                    title="Zoom Out"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* ========================================================================= */}
          {/* RIGHT SIDEBAR ANALYTICS CARDS (Hidden when in Routes mode)               */}
          {/* ========================================================================= */}
          {activeNav !== 'Routes' && (
            <div className="xl:col-span-4 flex flex-col gap-4">
              
              {/* Card 1: Current Risk Overview (Donut Chart) */}
              <div className="bg-[#0D121C] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-[14px] text-white">Risk Overview ({currentCityData.name})</h3>
                    <Info className="w-3.5 h-3.5 text-white/40 cursor-pointer hover:text-white" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    currentCityData.type === 'primary' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {currentCityData.tag}
                  </span>
                </div>

                {/* Donut Chart and Legend */}
                <div className="flex items-center justify-between py-4">
                  {/* SVG Donut Chart */}
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1F2937" strokeWidth="12" />
                      {/* Safe (Green) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10B981" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="0" />
                      {/* Low Risk (Yellow) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#FBBF24" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="115" />
                      {/* Medium Risk (Amber) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#F97316" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="175" />
                      {/* High Risk (Red) */}
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#EF4444" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="210" />
                    </svg>
                    {/* Center Shield Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-[#141A26] border border-white/10 flex items-center justify-center text-white/80">
                        <Shield className="w-4 h-4 text-[#F56A00]" />
                      </div>
                    </div>
                  </div>

                  {/* Risk Breakdown Legend */}
                  <div className="space-y-2 text-[12px] font-semibold flex-1 pl-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/70">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                        <span>High Risk</span>
                      </div>
                      <span className="font-mono font-bold text-white">{currentCityData.type === 'primary' ? '18' : '12'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/70">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                        <span>Medium Risk</span>
                      </div>
                      <span className="font-mono font-bold text-white">{currentCityData.type === 'primary' ? '34' : '28'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/70">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
                        <span>Low Risk</span>
                      </div>
                      <span className="font-mono font-bold text-white">58</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/70">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                        <span>Safe</span>
                      </div>
                      <span className="font-mono font-bold text-white">142</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-white/40">
                  <span>Confidence {currentCityData.confidence} · Calibrated</span>
                  <RefreshCw className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" />
                </div>
              </div>

              {/* Card 2: Live Nowcast Summary & Data Fabric Status */}
              <div className="bg-[#0D121C] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-[14px] text-white">Rainfall Ingestion Fabric</h3>
                      <button
                        onClick={() => setIsFabricModalOpen(true)}
                        className="p-1 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        title="Inspect Multi-Provider Ingestion Fabric"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => setIsFabricModalOpen(true)}
                      className="text-[11px] text-[#F56A00] font-mono font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Fabric Status</span>
                      <Radio className="w-3 h-3 animate-pulse" />
                    </button>
                  </div>

                  {/* Live Provider Data Provenance Banner */}
                  <div 
                    onClick={() => setIsFabricModalOpen(true)}
                    className="mt-3 p-2.5 rounded-2xl bg-[#141A26] border border-white/10 hover:border-[#F56A00]/40 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 leading-none">
                            ● {rainfallSnapshot?.quality === 'LIVE' ? 'LIVE' : (rainfallSnapshot?.quality || 'LIVE')}
                          </span>
                          <span className="text-[11px] font-bold text-white leading-none">
                            {rainfallSnapshot?.providerDisplayName || 'Tomorrow.io Weather API'}
                          </span>
                        </div>
                        <span className="text-[9px] text-white/50 truncate block max-w-[170px] font-mono mt-1">
                          {rainfallSnapshot?.spatialResolution || '1km Global Mesh'} · {rainfallSnapshot?.resolutionMinutes || 1}m res
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      AUTH
                    </span>
                  </div>

                  {/* Sub-Banner: National Radar & Satellite Fallback Transparency */}
                  <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-[10px] text-white/60">
                    <span>○ IMD DWR: Awaiting GoI Approval</span>
                    <span className="text-cyan-400 font-mono">● GPM Ready</span>
                  </div>

                  <div className="space-y-3 py-3 text-[13px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-white/70">
                        <CloudRain className="w-4 h-4 text-cyan-400" />
                        <span>Precipitation Rate</span>
                      </div>
                      <span className="font-extrabold text-white">
                        {rainfallSnapshot?.averageIntensity_mm_hr ? `${rainfallSnapshot.averageIntensity_mm_hr} mm/hr` : (nasaTelemetry?.precipitationRate ? `${nasaTelemetry.precipitationRate.toFixed(1)} mm/hr` : currentCityData.rainfall)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-white/70">
                        <Droplets className="w-4 h-4 text-blue-400" />
                        <span>Max Predicted Depth</span>
                      </div>
                      <span className="font-extrabold text-white">{currentCityData.maxDepth}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-white/70">
                        <Waves className="w-4 h-4 text-cyan-400" />
                        <span>Affected Roads</span>
                      </div>
                      <span className="font-extrabold text-white">{currentCityData.affectedRoads}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-white/70">
                        <GitFork className="w-4 h-4 text-orange-400" />
                        <span>Drainage Surcharge</span>
                      </div>
                      <span className="font-extrabold text-white">{currentCityData.surcharge}</span>
                    </div>

                    {/* Confidence Progress Bar */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[12px] mb-1.5">
                        <span className="text-white/60">Hydraulic Convergence Quality</span>
                        <span className="font-extrabold text-cyan-400">
                          {currentCityData.confidence}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" 
                          style={{ width: currentCityData.confidence }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setIsFabricModalOpen(true)}
                  className="w-full mt-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-[12px] flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-[#F56A00]/40"
                >
                  <span>Inspect Data Source Status Fabric</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#F56A00]" />
                </button>
              </div>

            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* BOTTOM ROW: 3 ANALYTICS PANELS (Hidden when in Routes mode)                */}
        {/* ========================================================================= */}
        {activeNav !== 'Routes' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 px-4 lg:px-6 pt-2 pb-8">
            
            {/* Panel 1: Flood Depth Trend Line Chart */}
            <div className="bg-[#0D121C] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-[13px] text-white">Depth Projections (0–3h)</h4>
                  <span className="text-[11px] text-white/40">({currentCityData.name})</span>
                </div>
                <Info className="w-3.5 h-3.5 text-white/40" />
              </div>

              {/* SVG Line Graph */}
              <div className="py-3">
                <div className="h-32 w-full relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                    <line x1="0" y1="20" x2="300" y2="20" stroke="#ffffff10" strokeDasharray="3 3" />
                    <line x1="0" y1="50" x2="300" y2="50" stroke="#ffffff10" strokeDasharray="3 3" />
                    <line x1="0" y1="80" x2="300" y2="80" stroke="#ffffff10" strokeDasharray="3 3" />

                    <text x="-5" y="24" fill="#ffffff40" fontSize="9" textAnchor="end">1.0m</text>
                    <text x="-5" y="54" fill="#ffffff40" fontSize="9" textAnchor="end">0.5m</text>
                    <text x="-5" y="84" fill="#ffffff40" fontSize="9" textAnchor="end">0m</text>

                    {/* Line 1: Primary Catchment (Red/Orange) */}
                    <path
                      d="M 20 70 Q 100 45 180 30 T 280 18"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="20" cy="70" r="3.5" fill="#EF4444" />
                    <circle cx="100" cy="46" r="3.5" fill="#EF4444" />
                    <circle cx="180" cy="30" r="3.5" fill="#EF4444" />
                    <circle cx="280" cy="18" r="4" fill="#EF4444" stroke="#ffffff" strokeWidth="1.5" />

                    {/* Line 2: Secondary Catchment (Amber) */}
                    <path
                      d="M 20 85 Q 100 68 180 50 T 280 38"
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="20" cy="85" r="3.5" fill="#F97316" />
                    <circle cx="100" cy="70" r="3.5" fill="#F97316" />
                    <circle cx="180" cy="50" r="3.5" fill="#F97316" />
                    <circle cx="280" cy="38" r="4" fill="#F97316" stroke="#ffffff" strokeWidth="1.5" />

                    {/* Line 3: Outfall Line (Yellow) */}
                    <path
                      d="M 20 90 Q 100 84 180 72 T 280 65"
                      fill="none"
                      stroke="#FBBF24"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="20" cy="90" r="3" fill="#FBBF24" />
                    <circle cx="100" cy="84" r="3" fill="#FBBF24" />
                    <circle cx="180" cy="72" r="3" fill="#FBBF24" />
                    <circle cx="280" cy="65" r="3.5" fill="#FBBF24" stroke="#ffffff" strokeWidth="1.5" />
                  </svg>

                  {/* X Axis Time Labels */}
                  <div className="flex justify-between text-[10px] text-white/40 mt-2 font-mono">
                    <span>Now</span>
                    <span>+1 hr</span>
                    <span>+2 hr</span>
                    <span>+3 hr</span>
                  </div>
                </div>
              </div>

              {/* Line Legend */}
              <div className="flex items-center justify-around pt-2 border-t border-white/10 text-[11px] font-semibold">
                <div className="flex items-center gap-1.5 text-white/80">
                  <span className="w-2.5 h-0.5 bg-[#EF4444] rounded" />
                  <span>Critical Sump</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <span className="w-2.5 h-0.5 bg-[#F97316] rounded" />
                  <span>Trunk Canal</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <span className="w-2.5 h-0.5 bg-[#FBBF24] rounded" />
                  <span>Tidal Outfall</span>
                </div>
              </div>
            </div>

            {/* Panel 2: Real-time Catchment Alerts */}
            <div className="bg-[#0D121C] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-[13px] text-white">Live Catchment Alerts</h4>
                  <Info className="w-3.5 h-3.5 text-white/40" />
                </div>
                <button 
                  onClick={() => handleNavSelect('Alerts')}
                  className="text-[11px] font-bold text-[#F56A00] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              {/* Alert List */}
              <div className="space-y-2.5 py-3">
                {currentCityData.catchments && currentCityData.catchments.slice(0, 3).map((zone, idx) => (
                  <div 
                    key={idx}
                    onClick={() => drillToCatchment(zone)}
                    className="p-2.5 rounded-xl bg-[#141A26] border border-white/10 hover:border-[#F56A00]/40 flex items-start gap-3 transition-colors cursor-pointer"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      zone.risk === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-white">{zone.name}</span>
                        <span className="text-[10px] text-white/40">Live</span>
                      </div>
                      <p className="text-[11px] text-white/60 truncate">{zone.description}</p>
                      <p className="text-[10px] font-semibold text-[#F56A00]">
                        Depth {zone.depth} · {zone.drainage}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 3: Critical Road Impact & Clearance */}
            <div className="bg-[#0D121C] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-[13px] text-white">Detour & Clearance</h4>
                  <Info className="w-3.5 h-3.5 text-white/40" />
                </div>
                <button 
                  onClick={() => handleNavSelect('Routes')}
                  className="text-[11px] font-bold text-[#F56A00] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Launch Safe Route Finder</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Table */}
              <div className="py-2 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="text-white/40 text-[10px] uppercase font-bold border-b border-white/5 pb-1">
                      <th className="pb-2 font-normal">Corridor</th>
                      <th className="pb-2 font-normal text-right">Max Depth</th>
                      <th className="pb-2 font-normal text-right pr-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {[
                      { name: currentCityData.id === 'mumbai' ? 'SV Road / Milan' : 'Anna Salai Corridor', depth: '0.62 m', level: 'Diverted', badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30' },
                      { name: currentCityData.id === 'mumbai' ? 'LBS Marg / Kurla' : 'T. Nagar Main Rd', depth: '0.78 m', level: 'Critical', badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30' },
                      { name: currentCityData.id === 'mumbai' ? 'Dadar TT Flyover' : 'Nungambakkam Rd', depth: '0.31 m', level: 'Passable', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                      { name: currentCityData.id === 'mumbai' ? 'BKC Connector' : 'Adyar Bridge Rd', depth: '0.18 m', level: 'Clear', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                    ].map((road, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => handleNavSelect('Routes')}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                        title="Click to calculate safe bypass route"
                      >
                        <td className="py-2 text-white/90 group-hover:text-[#F56A00] font-semibold flex items-center gap-1.5">
                          <span>{road.name}</span>
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#F56A00] transition-opacity" />
                        </td>
                        <td className="py-2 text-right font-mono text-white/70">{road.depth}</td>
                        <td className="py-2 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${road.badgeColor}`}>
                            {road.level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Data Source Status & Multi-Provider Fabric Modal */}
      <DataSourceFabricModal
        isOpen={isFabricModalOpen}
        onClose={() => setIsFabricModalOpen(false)}
      />

    </div>
  );
};

export default LiveMapDashboard;
