'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  GitFork,
  Activity,
  Zap,
  Clock,
  Sliders,
  RotateCcw,
  Layers,
  CloudRain,
  ShieldAlert,
  Compass,
  CheckCircle,
  Waves,
  Radio,
  Droplets,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  Crosshair,
  Search,
  Filter,
  Eye,
  ArrowUpRight,
  Info,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Gauge,
  Workflow,
  Navigation,
  AlertTriangle,
  X,
  Loader2,
  MapPin
} from 'lucide-react';
import type { DeploymentCity, DrainageNode, DrainageEdge, CatchmentArea } from '@/lib/geoData';

interface DrainageNetworkPanelProps {
  cityData: DeploymentCity;
}

// ─── Status & Color Helpers ───────────────────────────────────────────────────

function getSurchargeColor(utilizationPct: number = 0): string {
  if (utilizationPct >= 115) return '#FF0033'; // Urgent Flashing Red
  if (utilizationPct >= 100) return '#FF3333'; // Critical Red Surcharged
  if (utilizationPct >= 80) return '#FFA500';  // Caution Amber
  if (utilizationPct >= 60) return '#38BDF8';  // Sky Blue
  return '#00FF66'; // Vibrant Green (Normal)
}

function getStatusBadge(status: string = '', utilPct: number = 0) {
  if (utilPct >= 100 || /surcharge|overflow|flood|backflow/i.test(status)) {
    return { label: 'CRITICAL BACKFLOW', bg: 'bg-red-500/25', text: 'text-red-400', border: 'border-red-500/50' };
  }
  if (utilPct >= 80 || /critical|warning|tide/i.test(status)) {
    return { label: 'SURCHARGED', bg: 'bg-amber-500/25', text: 'text-amber-400', border: 'border-amber-500/50' };
  }
  if (utilPct >= 60) {
    return { label: 'HIGH FLOW', bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/40' };
  }
  return { label: 'NORMAL FLOW', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' };
}

const NODE_COLORS: Record<string, string> = {
  INLET: '#38BDF8',
  MANHOLE: '#FFA500',
  JUNCTION: '#A855F7',
  PUMP: '#EC4899',
  OUTFALL: '#00FF66',
};

const NODE_SYMBOLS: Record<string, string> = {
  INLET: '▼',
  MANHOLE: '●',
  JUNCTION: '◆',
  PUMP: '⚡',
  OUTFALL: '🌊',
};

export const DrainageNetworkPanel: React.FC<DrainageNetworkPanelProps> = ({ cityData }) => {
  // Mode & UI state
  const [mode, setMode] = useState<'live' | 'simulate'>('live');
  const [isSimOpen, setIsSimOpen] = useState(false);
  const [isProjectInfoOpen, setIsProjectInfoOpen] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>('PIPE-P103');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'critical' | 'pumps'>('all');

  // Layer Toggles
  const [layers, setLayers] = useState({
    conduits: true,
    nodes: true,
    flowAnimation: true,
  });

  // Simulation Parameters
  const [simRainfall, setSimRainfall] = useState(70);
  const [simBlockage, setSimBlockage] = useState(25);
  const [simTide, setSimTide] = useState(2.9);
  const [simPump, setSimPump] = useState<'ALL_ON' | 'P16_TRIP' | 'DG_MODE'>('ALL_ON');

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const animFrameIdRef = useRef<number | null>(null);
  const dashOffsetRef = useRef<number>(0);
  const popupRef = useRef<any>(null);
  const nodeMarkersRef = useRef<any[]>([]);

  // ─── Emergency Routing State ──────────────────────────────────────────────
  const ROUTING_NODES = [
    { id: 'N_SION', name: 'Sion Circle Junction' },
    { id: 'N_KING_CIRCLE', name: 'King Circle / Gandhi Market' },
    { id: 'N_DADAR_TT', name: 'Dadar TT Circle' },
    { id: 'N_HINDMATA', name: 'Hindmata / Dr. Ambedkar Rd ⚠️' },
    { id: 'N_PAREL', name: 'Parel TT / KEM Hospital' },
    { id: 'N_LALBAUG', name: 'Lalbaug Flyover Approach' },
    { id: 'N_BYCULLA', name: 'Byculla Fire Station / JJ Flyover' },
    { id: 'N_FREEWAY_ENTRY', name: 'Eastern Freeway Wadala Ramp' },
    { id: 'N_SENAPATI_BAPAT', name: 'Senapati Bapat Marg Elevated' },
    { id: 'N_WORLI_NAKA', name: 'Worli Naka Junction' },
  ];
  const [sidebarTab, setSidebarTab] = useState<'inspector' | 'route'>('inspector');
  const [routeOrigin, setRouteOrigin] = useState('N_DADAR_TT');
  const [routeDest, setRouteDest] = useState('N_BYCULLA');
  const [routeVehicle, setRouteVehicle] = useState('EMERGENCY_AMBULANCE');
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<any>(null);
  const routePulseRef = useRef<number | null>(null);

  // Telemetry state
  const [telemetry, setTelemetry] = useState<{
    edges: DrainageEdge[];
    nodes: DrainageNode[];
    catchments: CatchmentArea[];
    summary: any;
    weather: any;
    bottlenecks: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Telemetry Fetch
  const fetchTelemetry = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ city: cityData.id, mode });
      if (mode === 'simulate') {
        params.set('simRainfall', simRainfall.toString());
        params.set('simBlockage', simBlockage.toString());
        params.set('simTideLevel', simTide.toString());
        params.set('simPumpStatus', simPump);
      }

      const res = await fetch(`/api/drainage/telemetry?${params}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      if (data.status === 'success') {
        setTelemetry({
          edges: data.edges || [],
          nodes: data.nodes || [],
          catchments: data.catchments || [],
          summary: data.summary || {},
          weather: data.weather || {},
          bottlenecks: data.bottlenecks || [],
        });
        setLastUpdated(new Date());

        if (!selectedEdgeId && (data.edges || []).length > 0) {
          const highUtil = (data.edges as DrainageEdge[]).find(e => (e.utilizationPct || 0) >= 80) || data.edges[0];
          setSelectedEdgeId(highUtil.id);
        }
      }
    } catch (e) {
      console.error('Drainage telemetry fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cityData.id, mode, simRainfall, simBlockage, simTide, simPump, selectedEdgeId]);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(() => fetchTelemetry(true), mode === 'live' ? 15000 : 40000);
    return () => clearInterval(interval);
  }, [fetchTelemetry, mode]);

  // Derived datasets
  const edges = useMemo(() => {
    const raw = telemetry?.edges && telemetry.edges.length > 0 ? telemetry.edges : cityData.drainageEdges || [];
    // Ensure coordinates exist on all edges
    return raw.map((e, i) => ({
      ...e,
      coordinates: e.coordinates && e.coordinates.length > 0 ? e.coordinates : (cityData.drainageEdges?.[i]?.coordinates || [
        [72.8478, 19.0178],
        [72.8450, 19.0220]
      ])
    }));
  }, [telemetry, cityData]);

  const nodes = useMemo(() => telemetry?.nodes || cityData.drainageNodes || [], [telemetry, cityData]);
  const summary = telemetry?.summary || {};
  const weather = telemetry?.weather || {};

  // Active selected items
  const activeEdge = useMemo(() => edges.find(e => e.id === selectedEdgeId) || edges[0] || null, [edges, selectedEdgeId]);
  const activeNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || nodes[0] || null, [nodes, selectedNodeId]);

  const fromNode = useMemo(() => nodes.find(n => n.id === activeEdge?.fromNodeId), [nodes, activeEdge]);
  const toNode = useMemo(() => nodes.find(n => n.id === activeEdge?.toNodeId), [nodes, activeEdge]);

  // Filtered Conduits list for sidebar
  const filteredEdges = useMemo(() => {
    return edges.filter(e => {
      if (filterMode === 'critical' && (e.utilizationPct || 0) < 80) return false;
      if (filterMode === 'pumps' && e.type !== 'outfall' && !e.name.toLowerCase().includes('pump')) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || (e.affectedRoad || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [edges, filterMode, searchQuery]);

  // ─── Fit bounds to show entire drainage network ────────────────────────────
  const fitNetworkBounds = useCallback((map: MapLibreMap) => {
    const coords: [number, number][] = [];

    edges.forEach(e => {
      if (e.coordinates && e.coordinates.length > 0) {
        e.coordinates.forEach(pt => coords.push(pt as [number, number]));
      }
    });

    nodes.forEach(n => {
      if (n.lng && n.lat) {
        coords.push([n.lng, n.lat]);
      }
    });

    if (coords.length > 0) {
      const bounds = coords.reduce(
        (acc, coord) => [
          [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
          [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])],
        ],
        [[coords[0][0], coords[0][1]], [coords[0][0], coords[0][1]]]
      );

      map.fitBounds(bounds as [[number, number], [number, number]], {
        padding: { top: 70, bottom: 70, left: 70, right: 70 },
        maxZoom: 15,
        duration: 1000,
      });
    }
  }, [edges, nodes]);

  // ─── Function to Pan and Inspect Asset when clicked from list ───────────────
  const handleSelectEdge = useCallback((edge: DrainageEdge) => {
    setSelectedEdgeId(edge.id);
    if (!mapInstanceRef.current || !edge.coordinates || edge.coordinates.length === 0) return;

    const map = mapInstanceRef.current;
    const midIdx = Math.floor(edge.coordinates.length / 2);
    const center = edge.coordinates[midIdx] as [number, number];

    map.flyTo({
      center: center,
      zoom: 14.5,
      pitch: 38,
      duration: 1000,
    });

    // Open popup directly over the selected conduit
    const isCrit = (edge.utilizationPct || 0) >= 100;
    const isSur = (edge.utilizationPct || 0) >= 80;
    const color = isCrit ? '#FF3333' : isSur ? '#FFA500' : '#00FF66';

    if (popupRef.current) {
      popupRef.current.setLngLat(center)
        .setHTML(`
          <div style="background:#0D1321;border:1px solid rgba(255,255,255,0.2);border-radius:14px;padding:14px;min-width:240px;font-family:sans-serif;color:#FFF;">
            <div style="font-size:10px;color:${color};font-weight:800;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">
              ${edge.type.toUpperCase()} · ${isCrit ? 'CRITICAL BACKFLOW' : isSur ? 'SURCHARGED' : 'NORMAL'}
            </div>
            <div style="font-size:15px;font-weight:800;margin-bottom:2px;line-height:1.2;">${edge.name}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${edge.affectedRoad || 'Drainage Corridor'}</div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;font-family:monospace;">
              <div style="background:rgba(255,255,255,0.06);padding:6px;border-radius:8px;text-align:center;">
                <div style="color:#94a3b8;font-size:9px;">LOAD</div>
                <div style="color:${color};font-weight:800;font-size:14px;">${edge.utilizationPct}%</div>
              </div>
              <div style="background:rgba(255,255,255,0.06);padding:6px;border-radius:8px;text-align:center;">
                <div style="color:#94a3b8;font-size:9px;">FLOW (Q)</div>
                <div style="color:#38bdf8;font-weight:800;font-size:14px;">${edge.currentFlow_m3s || '--'} m³/s</div>
              </div>
            </div>
            ${isCrit ? `<div style="margin-top:8px;padding:6px 8px;background:rgba(255,51,51,0.2);border:1px solid rgba(255,51,51,0.5);border-radius:6px;font-size:10px;color:#FCA5A5;font-weight:700;">🚨 Active Backflow: Water level exceeding ground elevation</div>` : ''}
          </div>
        `)
        .addTo(map);
    }
  }, []);

  // ─── Initialize MapLibre GL JS & Leaflet Layer Hybrid ───────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isMounted = true;

    (async () => {
      const maplibregl = await import('maplibre-gl');
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // High-Contrast Dark Canvas basemap with zero API key / watermark
      const mapStyle = {
        version: 8 as const,
        sources: {
          'dark-canvas': {
            type: 'raster' as const,
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: '© Esri, OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'dark-canvas-layer',
            type: 'raster' as const,
            source: 'dark-canvas',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      };

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: [72.8440, 19.0220],
        zoom: 13.5,
        pitch: 32,
        bearing: -8,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
      mapInstanceRef.current = map;

      // Initialize Popup Instance
      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        offset: 14,
      });

      map.on('load', () => {
        if (!isMounted) return;
        setIsMapReady(true);

        // 1. GeoJSON Conduits Line Source
        const edgeFeatures = edges.map(e => ({
          type: 'Feature' as const,
          properties: {
            id: e.id,
            name: e.name,
            type: e.type,
            status: e.status || 'NORMAL',
            utilization: e.utilizationPct || 40,
            flow: e.currentFlow_m3s || 0,
            capacity: e.capacity_m3s || 10,
            velocity: e.velocity_ms || 1.5,
            color: getSurchargeColor(e.utilizationPct),
            isCritical: (e.utilizationPct || 0) >= 100,
            road: e.affectedRoad || 'Drainage Corridor',
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: e.coordinates && e.coordinates.length > 0 ? e.coordinates : [
              [72.8478, 19.0178],
              [72.8450, 19.0220]
            ],
          },
        }));

        map.addSource('drainage-edges-src', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: edgeFeatures },
        });

        // Pipeline Glowing Outer Halo
        map.addLayer({
          id: 'conduits-glow',
          type: 'line',
          source: 'drainage-edges-src',
          paint: {
            'line-color': [
              'match',
              ['get', 'isCritical'],
              true, '#FF0033',
              '#00FF66'
            ],
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 10, 14, 18, 18, 26],
            'line-opacity': 0.5,
            'line-blur': 4,
          },
        });

        // Main Solid Pipeline Core
        map.addLayer({
          id: 'conduits-line',
          type: 'line',
          source: 'drainage-edges-src',
          paint: {
            'line-color': [
              'case',
              ['>=', ['get', 'utilization'], 100], '#FF3333',
              ['>=', ['get', 'utilization'], 80], '#FFA500',
              '#00FF66'
            ],
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 9, 18, 14],
            'line-opacity': 0.98,
          },
        });

        // Flashing Red Pulsing Layer for Critical Overcapacity Conduits
        map.addLayer({
          id: 'conduits-critical-pulse',
          type: 'line',
          source: 'drainage-edges-src',
          filter: ['>=', ['get', 'utilization'], 100],
          paint: {
            'line-color': '#FF0033',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 10, 14, 16, 18, 22],
            'line-opacity': 0.85,
            'line-blur': 3,
          },
        });

        // Animated Moving Flow Dash Stream
        map.addLayer({
          id: 'conduits-flow-dash',
          type: 'line',
          source: 'drainage-edges-src',
          paint: {
            'line-color': '#FFFFFF',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 14, 3.5, 18, 5],
            'line-dasharray': [2, 3],
            'line-opacity': 0.95,
          },
        });

        // 2. Nodes (Manholes, Inlets, Pumps, Outfalls)
        const nodeFeatures = nodes.map(n => ({
          type: 'Feature' as const,
          properties: {
            id: n.id,
            name: n.name,
            type: n.type,
            status: n.status || 'NORMAL',
            waterLevel: n.currentWaterLevel_m || 0,
            groundLevel: n.groundElevation_m || 0,
            depthCm: n.surfaceWaterDepth_cm || 0,
            color: (n.surfaceWaterDepth_cm || 0) > 0 ? '#FF0033' : (NODE_COLORS[n.type] || '#38BDF8'),
            isFlooding: (n.surfaceWaterDepth_cm || 0) > 0,
            symbol: NODE_SYMBOLS[n.type] || '●',
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [n.lng, n.lat],
          },
        }));

        map.addSource('drainage-nodes-src', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: nodeFeatures },
        });

        // Node Halo (Expands when flooding/backflow is active)
        map.addLayer({
          id: 'nodes-circle-halo',
          type: 'circle',
          source: 'drainage-nodes-src',
          paint: {
            'circle-radius': ['case', ['get', 'isFlooding'], 20, 12],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.4,
            'circle-blur': 2,
          },
        });

        // Node Circle Center
        map.addLayer({
          id: 'nodes-circle',
          type: 'circle',
          source: 'drainage-nodes-src',
          paint: {
            'circle-radius': ['case', ['get', 'isFlooding'], 11, 7.5],
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#FFFFFF',
            'circle-opacity': 1,
          },
        });

        // 3. Interactive Popups on Map Click
        map.on('click', 'conduits-line', (e) => {
          if (!e.features || e.features.length === 0) return;
          const feat = e.features[0];
          const p = feat.properties as any;
          setSelectedEdgeId(p.id);

          popupRef.current.setLngLat(e.lngLat)
            .setHTML(`
              <div style="background:#0D1321;border:1px solid rgba(255,255,255,0.2);border-radius:14px;padding:14px;min-width:240px;font-family:sans-serif;color:#FFF;">
                <div style="font-size:10px;color:${p.color};font-weight:800;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">
                  ${p.type} · ${p.status}
                </div>
                <div style="font-size:15px;font-weight:800;margin-bottom:2px;line-height:1.2;">${p.name}</div>
                <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${p.road}</div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;font-family:monospace;">
                  <div style="background:rgba(255,255,255,0.06);padding:6px;border-radius:8px;text-align:center;">
                    <div style="color:#94a3b8;font-size:9px;">LOAD</div>
                    <div style="color:${p.color};font-weight:800;font-size:14px;">${p.utilization}%</div>
                  </div>
                  <div style="background:rgba(255,255,255,0.06);padding:6px;border-radius:8px;text-align:center;">
                    <div style="color:#94a3b8;font-size:9px;">FLOW RATE (Q)</div>
                    <div style="color:#38bdf8;font-weight:800;font-size:14px;">${p.flow} m³/s</div>
                  </div>
                </div>
                ${p.utilization >= 100 ? `<div style="margin-top:8px;padding:6px 8px;background:rgba(255,51,51,0.2);border:1px solid rgba(255,51,51,0.5);border-radius:6px;font-size:10px;color:#FCA5A5;font-weight:700;">🚨 Active Backflow: Hydraulic head exceeding ground elevation</div>` : ''}
              </div>
            `)
            .addTo(map);
        });

        map.on('click', 'nodes-circle', (e) => {
          if (!e.features || e.features.length === 0) return;
          const feat = e.features[0];
          const p = feat.properties as any;
          setSelectedNodeId(p.id);

          popupRef.current.setLngLat(e.lngLat)
            .setHTML(`
              <div style="background:#0D1321;border:1px solid rgba(255,255,255,0.2);border-radius:14px;padding:14px;min-width:200px;font-family:sans-serif;color:#FFF;">
                <div style="font-size:10px;color:${p.color};font-weight:800;text-transform:uppercase;margin-bottom:2px;">
                  ${p.type} NODE
                </div>
                <div style="font-size:14px;font-weight:800;margin-bottom:6px;">${p.name}</div>
                <div style="font-size:11px;font-family:monospace;display:flex;flex-direction:column;gap:3px;color:#94a3b8;">
                  <div style="display:flex;justify-content:space-between;"><span>Water Level:</span> <strong style="color:#38bdf8;">${p.waterLevel} m</strong></div>
                  <div style="display:flex;justify-content:space-between;"><span>Ground Level:</span> <strong style="color:#fff;">${p.groundLevel} m</strong></div>
                  <div style="display:flex;justify-content:space-between;"><span>Street Ponding:</span> <strong style="color:${p.depthCm > 0 ? '#FF0033' : '#00FF66'};">${p.depthCm} cm</strong></div>
                </div>
                ${p.depthCm > 0 ? `<div style="margin-top:8px;padding:6px 8px;background:rgba(255,51,51,0.2);border:1px solid rgba(255,51,51,0.5);border-radius:6px;font-size:10px;color:#FCA5A5;font-weight:700;">🚨 Water overflowing manhole rim onto street</div>` : ''}
              </div>
            `)
            .addTo(map);
        });

        // Hover styling
        ['conduits-line', 'nodes-circle'].forEach(layer => {
          map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
        });

        // 4. Continuous Animation Loop for Flow Stream & Pulsing Backflow
        let pulsePhase = 0;
        const animateFlow = () => {
          if (!isMounted) return;
          pulsePhase += 0.05;

          // Pulse critical conduit lines opacity
          if (map.getLayer('conduits-critical-pulse')) {
            const opacity = 0.4 + Math.sin(pulsePhase * 3) * 0.4;
            map.setPaintProperty('conduits-critical-pulse', 'line-opacity', Math.max(0.1, opacity));
          }

          // Move flow dashes along conduits
          if (map.getLayer('conduits-flow-dash')) {
            const offset = (pulsePhase * 8) % 6;
            map.setPaintProperty('conduits-flow-dash', 'line-dasharray', [offset, 3]);
          }

          animFrameIdRef.current = requestAnimationFrame(animateFlow);
        };
        animFrameIdRef.current = requestAnimationFrame(animateFlow);

        // Auto zoom directly to network
        fitNetworkBounds(map);
      });
    })();

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [cityData, fitNetworkBounds]);

  // Update dynamic GeoJSON data on telemetry change
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    const map = mapInstanceRef.current;

    const edgeSource = map.getSource('drainage-edges-src') as any;
    if (edgeSource) {
      const edgeFeatures = edges.map(e => ({
        type: 'Feature' as const,
        properties: {
          id: e.id,
          name: e.name,
          type: e.type,
          status: e.status || 'NORMAL',
          utilization: e.utilizationPct || 40,
          flow: e.currentFlow_m3s || 0,
          capacity: e.capacity_m3s || 10,
          velocity: e.velocity_ms || 1.5,
          color: getSurchargeColor(e.utilizationPct),
          isCritical: (e.utilizationPct || 0) >= 100,
          road: e.affectedRoad || 'Drainage Corridor',
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: e.coordinates && e.coordinates.length > 0 ? e.coordinates : [
            [72.8478, 19.0178],
            [72.8450, 19.0220]
          ],
        },
      }));
      edgeSource.setData({ type: 'FeatureCollection', features: edgeFeatures });
    }

    const nodeSource = map.getSource('drainage-nodes-src') as any;
    if (nodeSource) {
      const nodeFeatures = nodes.map(n => ({
        type: 'Feature' as const,
        properties: {
          id: n.id,
          name: n.name,
          type: n.type,
          status: n.status || 'NORMAL',
          waterLevel: n.currentWaterLevel_m || 0,
          groundLevel: n.groundElevation_m || 0,
          depthCm: n.surfaceWaterDepth_cm || 0,
          color: (n.surfaceWaterDepth_cm || 0) > 0 ? '#FF0033' : (NODE_COLORS[n.type] || '#38BDF8'),
          isFlooding: (n.surfaceWaterDepth_cm || 0) > 0,
          symbol: NODE_SYMBOLS[n.type] || '●',
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [n.lng, n.lat],
        },
      }));
      nodeSource.setData({ type: 'FeatureCollection', features: nodeFeatures });
    }
  }, [edges, nodes, isMapReady]);

  // Toggle map layers
  const toggleLayer = (layerKey: 'conduits' | 'nodes' | 'flowAnimation') => {
    if (!mapInstanceRef.current || !isMapReady) return;
    const map = mapInstanceRef.current;
    const newState = !layers[layerKey];
    setLayers(prev => ({ ...prev, [layerKey]: newState }));

    const visibility = newState ? 'visible' : 'none';
    if (layerKey === 'conduits') {
      if (map.getLayer('conduits-line')) map.setLayoutProperty('conduits-line', 'visibility', visibility);
      if (map.getLayer('conduits-glow')) map.setLayoutProperty('conduits-glow', 'visibility', visibility);
      if (map.getLayer('conduits-flow-dash')) map.setLayoutProperty('conduits-flow-dash', 'visibility', visibility);
      if (map.getLayer('conduits-critical-pulse')) map.setLayoutProperty('conduits-critical-pulse', 'visibility', visibility);
    } else if (layerKey === 'nodes') {
      if (map.getLayer('nodes-circle')) map.setLayoutProperty('nodes-circle', 'visibility', visibility);
      if (map.getLayer('nodes-circle-halo')) map.setLayoutProperty('nodes-circle-halo', 'visibility', visibility);
    } else if (layerKey === 'flowAnimation') {
      if (map.getLayer('conduits-flow-dash')) map.setLayoutProperty('conduits-flow-dash', 'visibility', visibility);
    }
  };

  // ─── Render Route Layers on the MapLibre canvas ────────────────────────────
  const renderRouteLineOnMap = useCallback((safeCoords: [number, number][], hazardCoords: [number, number][]) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Hazardous standard route – dashed red
    const hazardGeoJson: any = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: hazardCoords } };
    if (map.getSource('hazard-route-source')) {
      (map.getSource('hazard-route-source') as any).setData(hazardGeoJson);
    } else {
      map.addSource('hazard-route-source', { type: 'geojson', data: hazardGeoJson });
      map.addLayer({ id: 'hazard-route-layer', type: 'line', source: 'hazard-route-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FF3333', 'line-width': 5, 'line-opacity': 0.75, 'line-dasharray': [2, 3] }
      });
    }

    // Flood-safe alternative – electric blue glow + solid + animated pulse
    const safeGeoJson: any = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: safeCoords } };
    if (map.getSource('navigation-route-source')) {
      (map.getSource('navigation-route-source') as any).setData(safeGeoJson);
    } else {
      map.addSource('navigation-route-source', { type: 'geojson', data: safeGeoJson });
      map.addLayer({ id: 'navigation-route-glow', type: 'line', source: 'navigation-route-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#00B2FF', 'line-width': 16, 'line-opacity': 0.35, 'line-blur': 6 }
      });
      map.addLayer({ id: 'navigation-route-layer', type: 'line', source: 'navigation-route-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#00B2FF', 'line-width': 7, 'line-opacity': 0.98 }
      });
      map.addLayer({ id: 'navigation-route-pulses', type: 'line', source: 'navigation-route-source',
        paint: { 'line-color': '#FFFFFF', 'line-width': 2.5, 'line-dasharray': [2, 4], 'line-opacity': 0.95 }
      });
    }

    // Animate white direction pulses
    if (routePulseRef.current) cancelAnimationFrame(routePulseRef.current);
    let phase = 0;
    const tick = () => {
      phase += 0.05;
      if (map.getLayer('navigation-route-pulses')) {
        map.setPaintProperty('navigation-route-pulses', 'line-dasharray', [(phase * 6) % 7, 4]);
      }
      routePulseRef.current = requestAnimationFrame(tick);
    };
    routePulseRef.current = requestAnimationFrame(tick);

    // Fit camera to both routes
    const all = [...safeCoords, ...hazardCoords];
    const bounds = all.reduce(
      (acc: [[number, number], [number, number]], c) => [
        [Math.min(acc[0][0], c[0]), Math.min(acc[0][1], c[1])],
        [Math.max(acc[1][0], c[0]), Math.max(acc[1][1], c[1])],
      ],
      [[all[0][0], all[0][1]], [all[0][0], all[0][1]]]
    );
    map.fitBounds(bounds as [[number, number], [number, number]], { padding: 70, duration: 1200, pitch: 30 });
  }, []);

  // ─── Clear Route Layers ────────────────────────────────────────────────────
  const clearRoute = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (routePulseRef.current) cancelAnimationFrame(routePulseRef.current);
    ['navigation-route-pulses', 'navigation-route-layer', 'navigation-route-glow', 'hazard-route-layer'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    ['navigation-route-source', 'hazard-route-source'].forEach(id => {
      if (map.getSource(id)) map.removeSource(id);
    });
    setRouteResult(null);
  }, []);

  // ─── displayFloodSafeRoute: calls Python backend → draws on map ────────────
  const displayFloodSafeRoute = useCallback(async () => {
    setRouteLoading(true);
    const DEMO_SAFE: [number, number][] = [
      [72.8611, 19.0378], [72.8680, 19.0200], [72.8650, 19.0000], [72.8420, 18.9650], [72.8330, 18.9780]
    ];
    const DEMO_HAZARD: [number, number][] = [
      [72.8611, 19.0378], [72.8550, 19.0310], [72.8450, 19.0220],
      [72.8478, 19.0178], [72.8420, 19.0060], [72.8360, 18.9950], [72.8330, 18.9780]
    ];

    try {
      const res = await fetch('http://127.0.0.1:8000/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: routeOrigin,
          destination: routeDest,
          vehicle_type: routeVehicle,
          critical_backflow_nodes: ['N_HINDMATA'],
          telemetry_surcharges: { 'PIPE-P101': (summary.avgCapacity_pct || 55) > 80 ? 122.6 : 55.0 }
        })
      });
      const data = await res.json();
      if (data.status === 'Success') {
        renderRouteLineOnMap(data.path_coordinates, data.hazard_coordinates);
        setRouteResult(data);
      } else {
        renderRouteLineOnMap(DEMO_SAFE, DEMO_HAZARD);
        setRouteResult({
          _demo: true,
          flood_safe_alternative_route: {
            total_distance_km: 10.0,
            estimated_travel_time_min: 9.5,
            bypass_corridor_used: 'Eastern Freeway Elevated Deck',
            safety_confidence_score: '99.4%'
          },
          standard_route: { flood_risk: 'HAZARDOUS_STRANDED' },
          navigation_instructions: [
            'START at Dadar TT Circle',
            'Continue on Eastern Freeway Elevated Deck',
            'ARRIVE at Byculla Fire Station'
          ]
        });
      }
    } catch {
      renderRouteLineOnMap(DEMO_SAFE, DEMO_HAZARD);
      setRouteResult({
        _demo: true,
        flood_safe_alternative_route: {
          total_distance_km: 10.0,
          estimated_travel_time_min: 9.5,
          bypass_corridor_used: 'Eastern Freeway Elevated Deck (DEMO)',
          safety_confidence_score: '99.4% (cached)'
        },
        standard_route: { flood_risk: 'HAZARDOUS_STRANDED' },
        navigation_instructions: [
          'START at Dadar TT Circle',
          'Via Eastern Freeway Wadala Ramp (Elevated)',
          'ARRIVE at Byculla Fire Station'
        ]
      });
    } finally {
      setRouteLoading(false);
    }
  }, [routeOrigin, routeDest, routeVehicle, summary.avgCapacity_pct, renderRouteLineOnMap]);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-[#080B11] text-white font-sans overflow-hidden">

      {/* ─── 1. TOP HEADER & TELEMETRY SUMMARY BAR ─────────────────────────── */}
      <div className="px-5 py-3.5 bg-[#0D121D] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        
        {/* Left Title & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EB5A00]/15 border border-[#EB5A00]/40 flex items-center justify-center shadow-lg shadow-[#EB5A00]/10">
            <GitFork className="w-5 h-5 text-[#EB5A00]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-[17px] text-white tracking-tight">Drainage Network Twin</h1>
              <span className="px-2 py-0.5 rounded-md bg-[#EB5A00]/15 border border-[#EB5A00]/30 text-[#EB5A00] text-[10px] font-mono font-bold">
                1D/2D HYDRO-GRAPH
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              {cityData.name} · {edges.length} Active Pipelines · {nodes.length} Hydraulic Nodes
              {lastUpdated && (
                <span className="ml-1.5 text-white/30 font-mono">
                  · Updated {lastUpdated.toLocaleTimeString('en-IN', { hour12: false })}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Center 4 Essential Metric Badges */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 flex items-center gap-2 text-[11px]">
            <span className="text-white/40 font-bold uppercase text-[9px]">Health</span>
            <span className={`font-mono font-extrabold ${summary.overallSystemHealth === 'CRITICAL' ? 'text-red-400' : 'text-emerald-400'}`}>
              ● {summary.overallSystemHealth || 'NOMINAL'}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 flex items-center gap-2 text-[11px]">
            <span className="text-white/40 font-bold uppercase text-[9px]">Surcharged</span>
            <span className="font-mono font-extrabold text-orange-400">
              {summary.surcharedCount || 0} / {edges.length} Conduits
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 flex items-center gap-2 text-[11px]">
            <span className="text-white/40 font-bold uppercase text-[9px]">Avg Load</span>
            <span className="font-mono font-extrabold text-sky-400">
              {summary.avgCapacity_pct || 0}% Q/Qcap
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 flex items-center gap-2 text-[11px]">
            <span className="text-white/40 font-bold uppercase text-[9px]">Pumps Online</span>
            <span className="font-mono font-extrabold text-emerald-400">
              {summary.activePumps || 16}/{summary.totalPumps || 18} Active
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          
          {/* Project Architecture Info Button */}
          <button
            onClick={() => setIsProjectInfoOpen(p => !p)}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              isProjectInfoOpen
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">How It Works</span>
          </button>

          <div className="flex items-center bg-[#141A26] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => { setMode('live'); setIsSimOpen(false); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'live' ? 'bg-emerald-500 text-black shadow' : 'text-white/60 hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${mode === 'live' ? 'bg-black animate-pulse' : 'bg-emerald-400'}`} />
              LIVE
            </button>
            <button
              onClick={() => { setMode('simulate'); setIsSimOpen(true); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'simulate' ? 'bg-[#EB5A00] text-white shadow' : 'text-white/60 hover:text-white'
              }`}
            >
              <Sliders className="w-3 h-3" />
              SIMULATE
            </button>
          </div>

          <button
            onClick={() => fetchTelemetry(true)}
            title="Refresh Network Telemetry"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#EB5A00]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── 2. UNDERSTANDABLE PROJECT EXPLANATION DRAWER ─────────────────────── */}
      {isProjectInfoOpen && (
        <div className="px-5 py-4 bg-gradient-to-r from-[#0F172A] to-[#1E293B] border-b border-sky-500/30 grid grid-cols-1 md:grid-cols-4 gap-4 text-[12px] shrink-0 animate-in fade-in duration-200">
          <div className="p-3 rounded-2xl bg-black/40 border border-sky-500/20">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-[13px] mb-1">
              <CloudRain className="w-4 h-4" /> 1. Rainfall Intake (1D)
            </div>
            <p className="text-white/70 text-[11px] leading-relaxed">
              Radar precipitation (mm/hr) enters urban catchments. Runoff is calculated via Rational Formula Q = (C · I · A) / 3.6.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-sky-500/20">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-[13px] mb-1">
              <Workflow className="w-4 h-4" /> 2. Pipe Hydraulics
            </div>
            <p className="text-white/70 text-[11px] leading-relaxed">
              Underground conduits calculate Manning velocity V and discharge Q. Gradient, diameter, and siltation % define capacity limits.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-sky-500/20">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-[13px] mb-1">
              <ShieldAlert className="w-4 h-4" /> 3. Surcharge & Backflow
            </div>
            <p className="text-white/70 text-[11px] leading-relaxed">
              When flow exceeds pipe capacity (Q &gt; Qcap), hydraulic head exceeds ground elevation, causing surface backflow out of manholes onto roads.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-sky-500/20">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[13px] mb-1">
              <Zap className="w-4 h-4" /> 4. Sump & Tidal Outfalls
            </div>
            <p className="text-white/70 text-[11px] leading-relaxed">
              Discharge pump stations (e.g. Love Grove) force water out to sea, countering coastal high tide backpressure.
            </p>
          </div>
        </div>
      )}

      {/* ─── 3. SIMULATION DRAWER (IF ACTIVE) ────────────────────────────────── */}
      {mode === 'simulate' && isSimOpen && (
        <div className="px-5 py-3 bg-[#111726] border-b border-[#EB5A00]/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px] shrink-0 animate-in fade-in duration-200">
          <div className="bg-black/30 p-2.5 rounded-xl border border-white/10">
            <div className="flex justify-between font-bold mb-1">
              <span className="text-white/60">🌧 Rainfall Intensity</span>
              <span className="text-sky-400 font-mono">{simRainfall} mm/hr</span>
            </div>
            <input
              type="range" min="0" max="150" step="5" value={simRainfall}
              onChange={e => setSimRainfall(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          <div className="bg-black/30 p-2.5 rounded-xl border border-white/10">
            <div className="flex justify-between font-bold mb-1">
              <span className="text-white/60">🚧 Pipe Siltation</span>
              <span className="text-orange-400 font-mono">{simBlockage}%</span>
            </div>
            <input
              type="range" min="0" max="80" step="5" value={simBlockage}
              onChange={e => setSimBlockage(Number(e.target.value))}
              className="w-full accent-orange-400 cursor-pointer"
            />
          </div>

          <div className="bg-black/30 p-2.5 rounded-xl border border-white/10">
            <div className="flex justify-between font-bold mb-1">
              <span className="text-white/60">🌊 Coastal Tide Level</span>
              <span className="text-purple-400 font-mono">+{simTide} m</span>
            </div>
            <input
              type="range" min="0.5" max="4.5" step="0.1" value={simTide}
              onChange={e => setSimTide(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          <div className="bg-black/30 p-2.5 rounded-xl border border-white/10 flex flex-col justify-between">
            <span className="text-white/60 font-bold">⚡ Pump Station Status</span>
            <select
              value={simPump}
              onChange={e => setSimPump(e.target.value as any)}
              className="bg-[#182133] border border-white/20 rounded-lg px-2 py-1 text-[11px] font-bold text-white cursor-pointer"
            >
              <option value="ALL_ON">All Pumps Online (100%)</option>
              <option value="P16_TRIP">Sump P-16 Tripped</option>
              <option value="DG_MODE">DG Backup (75%)</option>
            </select>
          </div>
        </div>
      )}

      {/* ─── 4. MAIN WORKSPACE: MAPLIBRE MAP (LEFT) + INSPECTOR (RIGHT) ─────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative">

        {/* ─── MAP CANVAS (8 cols) ───────────────────────────────────────────── */}
        <div className="lg:col-span-8 h-full relative bg-[#070A10] overflow-hidden">
          
          {/* WebGL Map Container */}
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

          {/* Floating Map HUD: Layer Toggles & Zoom Extents */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <div className="bg-[#0F172A]/90 backdrop-blur-md border border-white/15 rounded-2xl p-2 shadow-2xl flex items-center gap-1.5">
              <button
                onClick={() => toggleLayer('conduits')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  layers.conduits ? 'bg-[#EB5A00] text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                <GitFork className="w-3 h-3" />
                Pipelines ({edges.length})
              </button>

              <button
                onClick={() => toggleLayer('nodes')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  layers.nodes ? 'bg-sky-500 text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                <Activity className="w-3 h-3" />
                Nodes ({nodes.length})
              </button>

              <button
                onClick={() => toggleLayer('flowAnimation')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  layers.flowAnimation ? 'bg-emerald-500 text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                <Droplets className="w-3 h-3" />
                Flow Stream
              </button>

              <div className="w-[1px] h-4 bg-white/20 mx-1" />

              <button
                onClick={() => { if (mapInstanceRef.current) fitNetworkBounds(mapInstanceRef.current); }}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white/90 flex items-center gap-1 cursor-pointer transition-all"
                title="Fit to show all drainage networks"
              >
                <Crosshair className="w-3 h-3 text-[#EB5A00]" />
                Fit All
              </button>

              <button
                onClick={() => { setSidebarTab('route'); }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  sidebarTab === 'route' ? 'bg-[#00B2FF] text-black' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/90'
                }`}
              >
                <Navigation className="w-3 h-3" />
                Route
              </button>
            </div>

            {/* Quick Map Legend */}
            <div className="bg-[#0F172A]/90 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono text-white/70 flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#00FF66]" /> Normal (&lt;70%)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#FFA500]" /> Surcharged (70-99%)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#FF0033] animate-pulse" /> Critical (&ge;100%)</span>
            </div>
          </div>

          {/* Surcharge Quick Warning Banner */}
          {(summary.surcharedCount || 0) > 0 && (
            <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
              <div className="bg-red-500/20 backdrop-blur-md border border-red-500/40 rounded-2xl px-4 py-2.5 text-[11px] text-red-200 flex items-center justify-between shadow-2xl pointer-events-auto">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span><strong>{summary.surcharedCount} Surcharged Pipelines:</strong> Active backflow erupting onto street surface.</span>
                </div>
                <button
                  onClick={() => setFilterMode('critical')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-500 text-white cursor-pointer hover:bg-red-600 transition-all shrink-0"
                >
                  View Surcharged
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT SIDEBAR: HYDRAULIC INSPECTOR & ASSET DIRECTORY (4 cols) ──── */}
        <div className="lg:col-span-4 h-full bg-[#0D121D] border-l border-white/10 flex flex-col overflow-hidden">

          {/* Sidebar Tab Header */}
          <div className="p-3 border-b border-white/10 flex flex-col gap-2 shrink-0 bg-[#111724]">
            {/* Tab Switcher */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
              <button
                onClick={() => setSidebarTab('inspector')}
                className={`flex-1 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  sidebarTab === 'inspector' ? 'bg-[#EB5A00] text-white shadow' : 'text-white/50 hover:text-white'
                }`}
              >
                <Activity className="w-3 h-3" /> Inspector
              </button>
              <button
                onClick={() => setSidebarTab('route')}
                className={`flex-1 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  sidebarTab === 'route' ? 'bg-[#00B2FF] text-black shadow' : 'text-white/50 hover:text-white'
                }`}
              >
                <Navigation className="w-3 h-3" /> Emergency Route
              </button>
            </div>

            {/* Inspector sub-filters (only shown in inspector tab) */}
            {sidebarTab === 'inspector' && (
              <>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search pipeline name, road, or node..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-white/40 focus:outline-none focus:border-[#EB5A00]"
                  />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  {[
                    { id: 'all', label: `All (${edges.length})` },
                    { id: 'critical', label: `Surcharged (${edges.filter(e => (e.utilizationPct || 0) >= 80).length})` },
                    { id: 'pumps', label: 'Outfalls' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterMode(tab.id as any)}
                      className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                        filterMode === tab.id
                          ? 'bg-white/15 text-white font-extrabold border border-white/20'
                          : 'text-white/50 hover:text-white bg-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ─── EMERGENCY ROUTING TAB ──────────────────────────────────── */}
          {sidebarTab === 'route' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">

              {/* Backflow Alert Banner */}
              {(summary.surcharedCount || 0) > 0 && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-[11px]">
                  <div className="flex items-center gap-2 text-red-400 font-extrabold mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Active Backflow Detected
                  </div>
                  <p className="text-red-300/80 text-[10px] leading-relaxed">
                    {summary.surcharedCount} surcharged conduits. Hindmata / Dr. Ambedkar Rd at critical backflow.
                    JalRakshak is computing flood-safe bypass routes.
                  </p>
                </div>
              )}

              {/* Origin */}
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/40 mb-1.5">Origin Intersection</div>
                <select
                  value={routeOrigin}
                  onChange={e => setRouteOrigin(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-[11px] text-white font-mono cursor-pointer focus:outline-none focus:border-[#00B2FF]"
                >
                  {ROUTING_NODES.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>

              {/* Destination */}
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/40 mb-1.5">Destination Intersection</div>
                <select
                  value={routeDest}
                  onChange={e => setRouteDest(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-[11px] text-white font-mono cursor-pointer focus:outline-none focus:border-[#00B2FF]"
                >
                  {ROUTING_NODES.filter(n => n.id !== routeOrigin).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>

              {/* Vehicle Type */}
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/40 mb-1.5">Vehicle Class</div>
                <select
                  value={routeVehicle}
                  onChange={e => setRouteVehicle(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-[11px] text-white font-mono cursor-pointer focus:outline-none focus:border-[#00B2FF]"
                >
                  <option value="EMERGENCY_AMBULANCE">🚑 Emergency Ambulance (30 cm limit)</option>
                  <option value="COMMUTER_CAR">🚗 Commuter Car (15 cm limit)</option>
                  <option value="HIGH_CLEARANCE_TRUCK">🚛 High-Clearance Truck (60 cm limit)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={displayFloodSafeRoute}
                  disabled={routeLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#00B2FF] text-white text-[12px] font-extrabold flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-[#00B2FF]/30"
                >
                  {routeLoading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Computing...</>
                    : <><Navigation className="w-3.5 h-3.5" /> Find Safe Route</>}
                </button>
                {routeResult && (
                  <button
                    onClick={clearRoute}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Route Result Card */}
              {routeResult && (
                <div className="space-y-2">
                  {/* Summary badges */}
                  <div className="p-3 bg-[#0A1628] border border-[#00B2FF]/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-[#00B2FF]/20 border border-[#00B2FF]/40 text-[#00B2FF] text-[10px] font-extrabold font-mono">
                        SAFE · {routeResult.flood_safe_alternative_route?.total_distance_km} km · ~{routeResult.flood_safe_alternative_route?.estimated_travel_time_min} min
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-extrabold font-mono">
                        HAZARD: {routeResult.standard_route?.flood_risk?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/50 font-mono">
                      Via: <span className="text-[#00B2FF]">{routeResult.flood_safe_alternative_route?.bypass_corridor_used}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      Safety: {routeResult.flood_safe_alternative_route?.safety_confidence_score}
                    </div>
                    {routeResult._demo && (
                      <div className="text-[9px] text-amber-400/80 font-mono mt-1">
                        ⚠ Backend offline — cached demo route shown. Run: uvicorn emergency_flood_router:app --port 8000
                      </div>
                    )}
                  </div>

                  {/* Turn-by-turn instructions */}
                  <div className="space-y-1">
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/30 px-1">Turn-by-Turn</div>
                    {(routeResult.navigation_instructions || []).map((step: string, i: number) => (
                      <div key={i} className="text-[10px] font-mono text-white/70 px-3 py-2 bg-white/4 border border-white/8 rounded-lg border-l-2 border-l-[#00B2FF]">
                        {step}
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-[10px] font-mono text-white/50 pt-1">
                    <span className="flex items-center gap-1.5"><span className="w-5 h-1 rounded bg-[#00B2FF] inline-block" /> Safe Route</span>
                    <span className="flex items-center gap-1.5"><span className="w-5 h-1 rounded bg-red-500 inline-block opacity-70" style={{backgroundImage:'repeating-linear-gradient(90deg,#FF3333 0,#FF3333 4px,transparent 4px,transparent 8px)'}} /> Hazard</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── INSPECTOR TAB ─────────────────────────────────────────────── */}
          {sidebarTab === 'inspector' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Active Selected Asset Card */}
            {activeEdge && (
              <div className="bg-[#141A26] border border-white/10 rounded-2xl p-4 shadow-xl">
                
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-bold">
                        {activeEdge.id}
                      </span>
                      <span className="text-[10px] text-white/50 uppercase font-bold">
                        {activeEdge.material || 'RCC'} · {activeEdge.shape || 'Circular'}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-extrabold text-white mt-1 leading-tight">{activeEdge.name}</h3>
                    <p className="text-[11px] text-white/50 mt-0.5">{activeEdge.affectedRoad || 'Drainage Corridor'}</p>
                  </div>

                  {(() => {
                    const badge = getStatusBadge(activeEdge.status, activeEdge.utilizationPct);
                    return (
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Animated Pipe Cross-Section SVG */}
                <div className="my-3 bg-black/40 p-3 rounded-xl border border-white/10 flex items-center gap-4">
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="44" fill="#182234" stroke="#475569" strokeWidth="6" />
                      <clipPath id={`pipe-clip-${activeEdge.id}`}>
                        <circle cx="50" cy="50" r="41" />
                      </clipPath>
                      <rect
                        x="0"
                        y={Math.max(8, 92 - Math.min(84, (activeEdge.utilizationPct || 0) * 0.84))}
                        width="100" height="100"
                        fill={getSurchargeColor(activeEdge.utilizationPct)}
                        opacity="0.85"
                        clipPath={`url(#pipe-clip-${activeEdge.id})`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[13px] font-black text-white font-mono">{activeEdge.utilizationPct}%</span>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div>
                      <div className="text-white/40">FLOW RATE (Q)</div>
                      <div className="font-extrabold text-sky-400 text-[12px]">{activeEdge.currentFlow_m3s || '--'} m³/s</div>
                    </div>
                    <div>
                      <div className="text-white/40">MAX CAP (Qcap)</div>
                      <div className="font-extrabold text-white text-[12px]">{activeEdge.capacity_m3s || '--'} m³/s</div>
                    </div>
                    <div>
                      <div className="text-white/40">VELOCITY (V)</div>
                      <div className="font-extrabold text-amber-300 text-[12px]">{activeEdge.velocity_ms || '--'} m/s</div>
                    </div>
                    <div>
                      <div className="text-white/40">FREEBOARD</div>
                      <div className={`font-extrabold text-[12px] ${(activeEdge.freeboard_m ?? 1) < 0 ? 'text-red-400 font-black animate-pulse' : 'text-emerald-400'}`}>
                        {activeEdge.freeboard_m ?? 0.8} m
                      </div>
                    </div>
                  </div>
                </div>

                {/* Node Connectivity Stream */}
                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 text-[10px] font-mono">
                  <div>
                    <span className="text-white/40 block text-[8px] uppercase">Upstream Node</span>
                    <strong className="text-white">{fromNode?.name || activeEdge.fromNodeId}</strong>
                  </div>
                  <div className="text-[#EB5A00] font-bold text-sm">━━▶</div>
                  <div className="text-right">
                    <span className="text-white/40 block text-[8px] uppercase">Downstream Node</span>
                    <strong className="text-white">{toNode?.name || activeEdge.toNodeId}</strong>
                  </div>
                </div>

                {/* Forecast Timeline */}
                {activeEdge.forecasts && activeEdge.forecasts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex justify-between items-center text-[10px] font-bold text-white/50 mb-2">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-[#EB5A00]" /> 3-Hour Surcharge Forecast</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center font-mono">
                      {activeEdge.forecasts.slice(0, 5).map((fc, i) => (
                        <div key={i} className="p-1 rounded-lg bg-white/5 text-[9px]">
                          <div className="text-white/40">{fc.timeMin === 0 ? 'NOW' : `+${fc.timeMin}m`}</div>
                          <div className="font-extrabold my-0.5" style={{ color: getSurchargeColor(fc.utilizationPct) }}>
                            {fc.utilizationPct}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Conduits Directory - Synchronized clicking */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-extrabold text-white/40 uppercase tracking-wider px-1">
                Active Pipelines ({filteredEdges.length})
              </div>
              
              {filteredEdges.map(edge => {
                const isSelected = edge.id === selectedEdgeId;
                const badge = getStatusBadge(edge.status, edge.utilizationPct);
                const isCrit = (edge.utilizationPct || 0) >= 100;

                return (
                  <button
                    key={edge.id}
                    onClick={() => handleSelectEdge(edge)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#182133] border-[#EB5A00] shadow-lg shadow-[#EB5A00]/20'
                        : isCrit
                        ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                        : 'bg-white/3 border-white/5 hover:bg-white/6 hover:border-white/15'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-bold text-white truncate flex items-center gap-1.5">
                        {isCrit && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                        {edge.name}
                      </div>
                      <div className="text-[9px] text-white/40 font-mono">
                        {edge.id} · {edge.currentFlow_m3s} m³/s · {(edge.length_m / 1000).toFixed(1)} km
                      </div>
                    </div>
                    
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {edge.utilizationPct}%
                    </span>
                  </button>
                );
              })}
            </div>

          </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default DrainageNetworkPanel;
