'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Navigation,
  ShieldCheck,
  AlertTriangle,
  ArrowUpDown,
  Car,
  Bus,
  Bike,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CornerUpRight,
  Loader2,
  MapPin,
  Hospital,
  Home,
  Train,
  Flame,
  Building2,
  Search,
  Crosshair,
  Sparkles,
  Download,
  X,
} from 'lucide-react';
import { VehicleType, FloodRouteComparison } from '@/lib/routing/types';
import {
  CITY_EMERGENCY_HUBS,
  calculateFloodSafeRoute,
} from '@/lib/routing/engine';
import { RouteAlternativeItem } from '@/app/api/routing/directions/route';
import { LeafletRouteMap } from '@/components/LeafletRouteMap';

interface SafeRoutePlannerProps {
  cityId: string;
  selectedRouteComparison: FloodRouteComparison;
  onSelectRouteComparison: (comparison: FloodRouteComparison) => void;
  activeRouteView: 'safe' | 'inundated' | 'both';
  onSetActiveRouteView: (view: 'safe' | 'inundated' | 'both') => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onClose?: () => void;
  onFlyToOrigin?: (lat: number, lng: number) => void;
  onRealMultipleRoutes?: (
    routes: RouteAlternativeItem[],
    selectedIdx: number,
    origin?: { lat: number; lng: number; label: string } | null,
    dest?: { lat: number; lng: number; label: string } | null,
    isLoading?: boolean,
    error?: string | null
  ) => void;
  onCityChange?: (cityId: string) => void;
}

const HUB_ICONS: Record<string, React.ReactNode> = {
  hospital:   <Hospital  className="w-3.5 h-3.5 text-rose-500" />,
  shelter:    <Home      className="w-3.5 h-3.5 text-emerald-600" />,
  transit:    <Train     className="w-3.5 h-3.5 text-violet-500" />,
  subway:     <Train     className="w-3.5 h-3.5 text-blue-500" />,
  commercial: <Building2 className="w-3.5 h-3.5 text-amber-500" />,
  hotspot:    <Flame     className="w-3.5 h-3.5 text-orange-500" />,
};

const HUB_BADGE_CLASS: Record<string, string> = {
  hospital:   'bg-rose-100 text-rose-700 border-rose-200',
  shelter:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  transit:    'bg-violet-100 text-violet-700 border-violet-200',
  subway:     'bg-blue-100 text-blue-700 border-blue-200',
  commercial: 'bg-amber-100 text-amber-700 border-amber-200',
  hotspot:    'bg-orange-100 text-orange-700 border-orange-200',
};

export const SafeRoutePlanner: React.FC<SafeRoutePlannerProps> = ({
  cityId,
  selectedRouteComparison,
  onSelectRouteComparison,
  activeRouteView,
  onSetActiveRouteView,
  isSimulating,
  onToggleSimulation,
  onClose,
  onFlyToOrigin,
  onRealMultipleRoutes,
  onCityChange,
}) => {
  const cityHubs = cityId ? (CITY_EMERGENCY_HUBS[cityId] || []) : [];
  const allEmergencyHubs = useMemo(() => {
    return (cityId && cityHubs.length > 0)
      ? cityHubs
      : Object.values(CITY_EMERGENCY_HUBS).flat();
  }, [cityId, cityHubs]);

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(
    selectedRouteComparison.vehicle.id
  );
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(0);
  const [isStepsExpanded, setIsStepsExpanded] = useState(false);

  // ── Origin: empty by default with Nominatim / Geocoding & GPS ──
  const [originQuery, setOriginQuery] = useState<string>('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const originInputRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Destination: empty by default with Shelter / Evacuation Hub Picker ──
  const [destHubId, setDestHubId] = useState<string>('');
  const [selectedDestHub, setSelectedDestHub] = useState<{
    id: string;
    name: string;
    category?: string;
    address: string;
    lat: number;
    lng: number;
    cityId?: string;
  } | null>(null);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const destRef = useRef<HTMLDivElement>(null);

  const destHub = selectedDestHub || allEmergencyHubs.find(h => h.id === destHubId) || null;

  // ── ORS & Safety Algorithm State ──
  const [isLoadingORS, setIsLoadingORS] = useState(false);
  const [orsRoutes, setOrsRoutes] = useState<RouteAlternativeItem[]>([]);
  const [orsError, setOrsError] = useState<string | null>(null);
  const [aiBriefing, setAiBriefing] = useState<string>('');
  const [avoidPolygonsActive, setAvoidPolygonsActive] = useState<boolean>(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (destRef.current && !destRef.current.contains(e.target as Node)) setShowDestPicker(false);
      if (originInputRef.current && !originInputRef.current.contains(e.target as Node)) setOriginSuggestions([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Browser Geolocation (Real Live User GPS on Demand) ──
  const handleLocateUser = useCallback((onSuccess?: (coords: { lat: number; lng: number; label: string }) => void) => {
    if (!navigator.geolocation) {
      setOrsError('Geolocation is not supported by your browser. Please type your location or address.');
      return;
    }
    setIsLocating(true);
    setOrsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const label = `📍 My Live Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setOriginCoords({ lat, lng });
        setOriginQuery(label);
        setIsLocating(false);
        if (onFlyToOrigin) onFlyToOrigin(lat, lng);
        const destObj = destHub ? { lat: destHub.lat, lng: destHub.lng, label: destHub.name } : null;
        if (onRealMultipleRoutes && !destHub) {
          onRealMultipleRoutes([], 0, { lat, lng, label }, null);
        }
        if (onSuccess) onSuccess({ lat, lng, label });
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setIsLocating(false);
        setOrsError('Location permission not granted. Please allow GPS access or search your location/address above.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [destHub, onFlyToOrigin, onRealMultipleRoutes]);

  // ── Nominatim / Geocoding Search ──
  const searchOrigin = useCallback(async (text: string) => {
    if (text.trim().length < 2) { setOriginSuggestions([]); return; }
    setIsSearchingOrigin(true);
    try {
      const res = await fetch(`/api/routing/geocode?text=${encodeURIComponent(text)}`);
      if (!res.ok) return;
      const data = await res.json();
      setOriginSuggestions(data.results || []);
    } catch { /* ignore */ } finally {
      setIsSearchingOrigin(false);
    }
  }, []);

  const handleOriginInput = (value: string) => {
    setOriginQuery(value);
    setOriginCoords(null);
    setOrsRoutes([]);
    setOrsError(null);
    // Clear origin marker & routes from map immediately when typing
    const destObj = destHub ? { lat: destHub.lat, lng: destHub.lng, label: destHub.name } : null;
    if (onRealMultipleRoutes) onRealMultipleRoutes([], 0, null, destObj);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchOrigin(value), 400);
  };

  const handleClearOrigin = () => {
    setOriginQuery('');
    setOriginCoords(null);
    setOrsRoutes([]);
    setOrsError(null);
    setAiBriefing('');
    setOriginSuggestions([]);
    const destObj = destHub ? { lat: destHub.lat, lng: destHub.lng, label: destHub.name } : null;
    if (onRealMultipleRoutes) onRealMultipleRoutes([], 0, null, destObj);
  };

  const handleClearDest = () => {
    setDestHubId('');
    setOrsRoutes([]);
    setOrsError(null);
    setAiBriefing('');
    const origObj = originCoords ? { lat: originCoords.lat, lng: originCoords.lng, label: originQuery } : null;
    if (onRealMultipleRoutes) onRealMultipleRoutes([], 0, origObj, null);
  };

  const handleSelectOriginSuggestion = (item: any) => {
    const label = item.label || item.name;
    setOriginQuery(label);
    setOriginCoords({ lat: item.lat, lng: item.lng });
    setOriginSuggestions([]);
    if (onFlyToOrigin) onFlyToOrigin(item.lat, item.lng);
    const destObj = destHub ? { lat: destHub.lat, lng: destHub.lng, label: destHub.name } : null;
    if (onRealMultipleRoutes && !destHub) {
      onRealMultipleRoutes([], 0, { lat: item.lat, lng: item.lng, label }, null);
    }
  };

  // ── Fetch Routes via ORS / OSRM + Safety Algorithm ──
  const fetch3Routes = useCallback(async (
    oLat: number, oLng: number,
    dLat: number, dLng: number,
    vehicle: string,
    destName?: string,
    targetCityId?: string,
  ) => {
    const activeCity = targetCityId || cityId;
    if (!activeCity) return;
    setIsLoadingORS(true);
    setOrsError(null);
    const origObj = { lat: oLat, lng: oLng, label: originQuery || '📍 My Live Location' };
    const destObj = { lat: dLat, lng: dLng, label: destName || 'Safe Shelter' };

    // Do NOT wipe routes to empty array while loading — keep existing lines visible to prevent flicker
    if (onRealMultipleRoutes && orsRoutes.length > 0) {
      onRealMultipleRoutes(orsRoutes, selectedRouteIdx, origObj, destObj, true, null);
    }

    try {
      const res = await fetch('/api/routing/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: oLat, originLng: oLng, originLabel: origObj.label,
          destLat: dLat,   destLng: dLng,   destLabel: destObj.label,
          vehicle, cityId: activeCity,
        }),
      });
      if (!res.ok) throw new Error('Route calculation failed');
      const data = await res.json();
      if (data.aiBriefing) setAiBriefing(data.aiBriefing);
      if (data.avoidPolygonsApplied !== undefined) setAvoidPolygonsActive(!!data.avoidPolygonsApplied);
      const routes: RouteAlternativeItem[] = data.routes || [];
      if (routes.length > 0) {
        setOrsRoutes(routes);
        setSelectedRouteIdx(0);
        if (onRealMultipleRoutes) onRealMultipleRoutes(routes, 0, origObj, destObj, false, null);
      } else {
        const err = 'No road path found between points.';
        setOrsError(err);
        if (onRealMultipleRoutes) onRealMultipleRoutes([], 0, origObj, destObj, false, err);
      }
    } catch {
      const err = 'Could not compute road path. Please check coordinates.';
      setOrsError(err);
      if (onRealMultipleRoutes) onRealMultipleRoutes(orsRoutes, selectedRouteIdx, origObj, destObj, false, err);
    } finally {
      setIsLoadingORS(false);
    }
  }, [cityId, originQuery, onRealMultipleRoutes, orsRoutes, selectedRouteIdx]);

// Helper: Great-circle Haversine distance in kilometers
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

  // ── One-Tap Emergency Evacuation to Nearest Safe Shelter (Universal GPS) ──
  const handleEvacuateToNearestShelter = () => {
    const findNearestAndRoute = async (userLat: number, userLng: number, originLabel?: string) => {
      setIsLoadingORS(true);
      setOrsError(null);

      try {
        let targetShelter: any = null;

        // 1. Identify closest major administrative city hub for regional telemetry
        const CITY_LOCATIONS: Record<string, [number, number]> = {
          chennai: [13.0827, 80.2707],
          mumbai: [19.0760, 72.8777],
          bengaluru: [12.9716, 77.5946],
          delhi: [28.6139, 77.2090],
        };
        let targetCity = cityId || 'chennai';
        let minCityDist = Infinity;
        for (const [cId, [cLat, cLng]] of Object.entries(CITY_LOCATIONS)) {
          const d = haversineDistKm(userLat, userLng, cLat, cLng);
          if (d < minCityDist) {
            minCityDist = d;
            targetCity = cId;
          }
        }

        // 2. Query dynamic nearby shelters & hospitals API for this exact coordinate
        const res = await fetch(`/api/routing/nearby-shelters?lat=${userLat}&lng=${userLng}`);
        if (res.ok) {
          const data = await res.json();
          if (data.closest) {
            targetShelter = data.closest;
          }
        }

        // 3. Fallback to closest curated hub from all available city hubs
        if (!targetShelter) {
          const allHubs = Object.values(CITY_EMERGENCY_HUBS).flat();
          let minDistance = Infinity;
          for (const c of allHubs) {
            const distKm = haversineDistKm(userLat, userLng, c.lat, c.lng);
            if (distKm < minDistance) {
              minDistance = distKm;
              targetShelter = c;
            }
          }
        }

        if (targetShelter) {
          setDestHubId(targetShelter.id);
          setSelectedDestHub(targetShelter);
          setShowDestPicker(false);
          if (onCityChange && targetCity !== cityId) {
            onCityChange(targetCity);
          }
          if (onFlyToOrigin) {
            onFlyToOrigin(userLat, userLng);
          }
          setOriginCoords({ lat: userLat, lng: userLng });
          const liveLabel = originLabel || `📍 My Live Location (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`;
          setOriginQuery(liveLabel);
          
          await fetch3Routes(
            userLat,
            userLng,
            targetShelter.lat,
            targetShelter.lng,
            selectedVehicle,
            targetShelter.name,
            targetCity
          );
        } else {
          setOrsError('No emergency shelter or hospital could be located within range. Please enter a destination manually.');
        }
      } catch (err: any) {
        console.warn('Nearby shelters lookup error:', err.message);
        setOrsError('Emergency routing service temporary error. Retrying with standard corridors...');
      } finally {
        setIsLoadingORS(false);
      }
    };

    // If user has already placed an origin pin/address, use it; otherwise get fresh live device GPS
    if (originCoords) {
      findNearestAndRoute(originCoords.lat, originCoords.lng, originQuery);
    } else {
      handleLocateUser((detected) => {
        setOriginCoords({ lat: detected.lat, lng: detected.lng });
        setOriginQuery(detected.label);
        findNearestAndRoute(detected.lat, detected.lng, detected.label);
      });
    }
  };

  // ── Export Rich GPX File with Timestamps + Open in Viewer ──
  const handleExportGPX = () => {
    const route = orsRoutes[selectedRouteIdx];
    if (!route || !route.coordinates || route.coordinates.length === 0) return;

    const now = new Date();
    const totalDurationSecs = (route.durationMin || 0) * 60;
    const totalPoints = route.coordinates.length;

    // Build trackpoints with interpolated timestamps and stub elevation
    const gpxPoints = route.coordinates.map(([lng, lat], i) => {
      const frac = totalPoints > 1 ? i / (totalPoints - 1) : 0;
      const ts = new Date(now.getTime() + frac * totalDurationSecs * 1000).toISOString();
      const ele = 10 + Math.sin(frac * Math.PI) * 5; // subtle elevation curve for viewer
      return `      <trkpt lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}">
        <ele>${ele.toFixed(1)}</ele>
        <time>${ts}</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:speed>${((route.distanceKm || 0) * 1000 / Math.max(totalDurationSecs, 1)).toFixed(1)}</gpxtpx:speed>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>`;
    }).join('\n');

    // Start & End waypoints (shown as pins in viewmygpx.com)
    const [startLng, startLat] = route.coordinates[0];
    const [endLng, endLat] = route.coordinates[route.coordinates.length - 1];
    const originLabel = originQuery || '📍 Origin';
    const destLabel = destHub?.name || '🏥 Destination';

    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="JalRakshak Emergency Safe Router"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1
    http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>JalRakshak — ${route.name || 'Safe Evacuation Route'}</name>
    <desc>${route.summaryText || ''} | Safety Score: ${route.safetyScore || 0}% | Flood-Safe Route for ${cityId ? cityId.charAt(0).toUpperCase() + cityId.slice(1) : 'City'}</desc>
    <author><name>JalRakshak Flood Emergency Routing System</name></author>
    <copyright author="OpenStreetMap Contributors"><license>https://www.openstreetmap.org/copyright</license></copyright>
    <time>${now.toISOString()}</time>
    <keywords>emergency, evacuation, flood, safe route, ${cityId || 'india'}</keywords>
    <bounds minlat="${Math.min(...route.coordinates.map(([, lat]) => lat)).toFixed(7)}"
            minlon="${Math.min(...route.coordinates.map(([lng]) => lng)).toFixed(7)}"
            maxlat="${Math.max(...route.coordinates.map(([, lat]) => lat)).toFixed(7)}"
            maxlon="${Math.max(...route.coordinates.map(([lng]) => lng)).toFixed(7)}" />
  </metadata>

  <!-- Start Waypoint -->
  <wpt lat="${startLat.toFixed(7)}" lon="${startLng.toFixed(7)}">
    <name>START: ${originLabel}</name>
    <desc>Evacuation start point</desc>
    <sym>Flag, Green</sym>
  </wpt>

  <!-- Destination Waypoint -->
  <wpt lat="${endLat.toFixed(7)}" lon="${endLng.toFixed(7)}">
    <name>SHELTER: ${destLabel}</name>
    <desc>${destHub?.address || 'Emergency Shelter / Hospital'}</desc>
    <sym>Medical</sym>
  </wpt>

  <trk>
    <name>${route.name || 'Safe Evacuation Route'}</name>
    <desc>Distance: ${route.distanceKm} km | Duration: ${route.durationMin} min | Safety: ${route.safetyScore}%</desc>
    <type>Emergency Evacuation</type>
    <trkseg>
${gpxPoints}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `JalRakshak_${cityId || 'route'}_${route.distanceKm}km.gpx`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!originCoords || !destHub) return;
    fetch3Routes(originCoords.lat, originCoords.lng, destHub.lat, destHub.lng, selectedVehicle, destHub.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originCoords?.lat, originCoords?.lng, destHub?.id, selectedVehicle]);

  const handleSelectRouteCard = (idx: number) => {
    setSelectedRouteIdx(idx);
    const origObj = originCoords ? { lat: originCoords.lat, lng: originCoords.lng, label: originQuery } : undefined;
    const destObj = destHub ? { lat: destHub.lat, lng: destHub.lng, label: destHub.name } : undefined;
    if (onRealMultipleRoutes && orsRoutes.length > 0) {
      onRealMultipleRoutes(orsRoutes, idx, origObj, destObj, false, null);
    }
  };

  const activeRoute = orsRoutes[selectedRouteIdx] || null;

  const fmt = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)} hr ${mins % 60 > 0 ? `${mins % 60} min` : ''}`;
  };

  return (
    <div className="w-[390px] sm:w-[415px] bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col font-sans transition-all duration-200">

      {/* ── HEADER: Title + Vehicle Profiles + Fording Limits ── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3.5 pb-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/30">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[13px] text-gray-900 leading-tight">Safe Evacuation Router</span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  LEAFLET · OSM
                </span>
              </div>
              <p className="text-[9px] text-gray-400 font-medium">Nominatim · OpenRouteService · Safety Engine</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 4 Vehicle Mode Pills */}
        <div className="grid grid-cols-4 gap-1.5">
          {([
            { id: 'car',       label: 'Driving',   icon: '🚗' },
            { id: 'bike',      label: '2-Wheeler', icon: '🛵' },
            { id: 'bus',       label: 'Transit',   icon: '🚌' },
            { id: 'ambulance', label: 'Rescue 4x4',icon: '🚑' },
          ] as const).map(v => {
            const isSelected = selectedVehicle === v.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVehicle(v.id as any);
                  if (onSelectRouteComparison && selectedRouteComparison) {
                    onSelectRouteComparison({
                      ...selectedRouteComparison,
                      vehicle: { ...selectedRouteComparison.vehicle, id: v.id as any }
                    });
                  }
                }}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-xs">{v.icon}</span>
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* Vehicle Fording & Clearance Limits Bar */}
        <div className="mt-2 py-1 px-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between text-[9.5px]">
          <span className="text-gray-500 font-medium">Clearance Rating:</span>
          <span className="text-emerald-700 font-extrabold">
            {selectedVehicle === 'bike' ? '🛵 Safe ≤0.10m · Skid/Stall >0.22m' :
             selectedVehicle === 'ambulance' ? '🚑 Safe ≤0.50m · Fords up to 0.85m' :
             selectedVehicle === 'bus' ? '🚌 Safe ≤0.55m · Fords up to 0.90m' :
             '🚗 Safe ≤0.20m · Engine Stall >0.40m'}
          </span>
        </div>
      </div>

      {/* ── LOCATION & DESTINATION INPUTS ── */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-2.5">

        {/* Quick Evacuate Button */}
        <button
          onClick={handleEvacuateToNearestShelter}
          className="w-full py-2.5 px-3 rounded-2xl text-[11px] font-extrabold flex items-center justify-center gap-2 shadow-md bg-gradient-to-r from-rose-600 via-amber-600 to-emerald-600 hover:opacity-95 text-white shadow-rose-600/25 transition-all cursor-pointer"
          title="Instantly capture your live GPS location and route to the closest emergency shelter or hospital"
        >
          <AlertTriangle className="w-4 h-4 text-amber-200 animate-pulse" />
          <span>⚡ Emergency Evacuate: Route to Nearest Shelter</span>
        </button>

        {/* Origin: Nominatim search with GPS locate button */}
        <div ref={originInputRef} className="relative">
          <div className="flex items-center justify-between mb-0.5 ml-1">
            <label className="text-[9px] uppercase font-extrabold text-gray-400 tracking-wide block">
              📍 Current Location (Nominatim Geocoder)
            </label>
            <button
              onClick={() => handleLocateUser()}
              disabled={isLocating}
              className="text-[9px] font-extrabold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              title="Use GPS Coordinates"
            >
              <Crosshair className="w-3 h-3 text-emerald-600" />
              <span>{isLocating ? 'Locating…' : 'Use GPS'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-2xl px-3 py-2.5 shadow-sm focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-[3px] ring-blue-200 shrink-0" />
            <input
              type="text"
              value={originQuery}
              onChange={e => handleOriginInput(e.target.value)}
              placeholder="Type your area, landmark, or street…"
              className="flex-1 bg-transparent text-[12px] font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            {isSearchingOrigin ? (
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
            ) : originQuery ? (
              <button onClick={handleClearOrigin} className="text-gray-400 hover:text-gray-600 cursor-pointer" title="Clear origin">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* Autocomplete Dropdown */}
          {originSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
              {originSuggestions.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectOriginSuggestion(item)}
                  className="w-full px-3 py-2.5 flex items-start gap-2.5 text-left hover:bg-emerald-50 border-b border-gray-100 last:border-0 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-gray-900 truncate">{item.name || item.label}</p>
                    {item.label && item.label !== item.name && (
                      <p className="text-[10px] text-gray-500 truncate">{item.label}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dotted path connector */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-2.5 flex justify-center">
            <div className="w-0.5 h-3 border-l-2 border-dotted border-gray-400" />
          </div>
          <span className="text-[8.5px] text-gray-400 font-extrabold uppercase tracking-wider">
            OSRM Flood Avoidance Corridor
          </span>
        </div>

          {/* Destination Hub Selector */}
        <div ref={destRef} className="space-y-1.5">
          <label className="text-[9px] uppercase font-extrabold text-gray-400 tracking-wide ml-1 block">
            🏥 Destination Safe Shelter / Hub
          </label>
          <div
            onClick={() => setShowDestPicker(v => !v)}
            role="button"
            tabIndex={0}
            className={`w-full flex items-center gap-2.5 bg-white border rounded-2xl px-3 py-2.5 shadow-sm transition-all text-left ${
              destHub
                ? 'border-gray-300 hover:border-emerald-600 hover:ring-2 hover:ring-emerald-100 cursor-pointer'
                : 'border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/40 cursor-pointer'
            }`}
          >
            <MapPin className={`w-4 h-4 shrink-0 ${destHub ? 'text-rose-500 fill-rose-500' : 'text-gray-400'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-bold truncate ${destHub ? 'text-gray-900' : 'text-gray-500'}`}>
                {destHub?.name || 'Choose destination safe shelter / relief hub…'}
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                {destHub?.address || 'Tap to choose from verified shelters & hospitals'}
              </p>
            </div>
            {destHub ? (
              <div className="flex items-center gap-1.5 shrink-0">
                {HUB_ICONS[destHub.category || 'shelter'] || HUB_ICONS['shelter']}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${HUB_BADGE_CLASS[destHub.category || 'shelter'] || HUB_BADGE_CLASS['shelter']}`}>
                  {(destHub.category || 'shelter').toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClearDest();
                  }}
                  className="ml-1 p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer z-10"
                  title="Clear destination"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${showDestPicker ? 'rotate-180' : ''}`} />
            )}
          </div>

          {/* Inline Expandable Shelters List — Cleanly Grouped City-Wise */}
          {showDestPicker && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-inner overflow-hidden max-h-64 overflow-y-auto divide-y divide-gray-100 animate-in fade-in zoom-in-98 duration-100">
              {cityId && CITY_EMERGENCY_HUBS[cityId] ? (
                <div>
                  <div className="px-3 py-1.5 bg-emerald-50 flex items-center justify-between sticky top-0 z-10 border-b border-emerald-100">
                    <p className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider">
                      📍 {cityId.toUpperCase()} VERIFIED RELIEF SITES
                    </p>
                    <span className="text-[9px] font-bold text-emerald-700">{CITY_EMERGENCY_HUBS[cityId].length} sites</span>
                  </div>
                  {CITY_EMERGENCY_HUBS[cityId].map(hub => (
                    <button
                      key={hub.id}
                      onClick={() => {
                        setDestHubId(hub.id);
                        setSelectedDestHub(hub);
                        setShowDestPicker(false);
                        setOrsRoutes([]);
                        if (hub.cityId && hub.cityId !== cityId && onCityChange) {
                          onCityChange(hub.cityId);
                        }
                      }}
                      className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left hover:bg-emerald-50/80 transition-colors cursor-pointer ${
                        destHub?.id === hub.id ? 'bg-emerald-50 font-bold border-l-3 border-l-emerald-600' : ''
                      }`}
                    >
                      <div className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        {HUB_ICONS[hub.category || 'shelter'] || HUB_ICONS['shelter']}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-gray-900 truncate">{hub.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{hub.address}</p>
                      </div>
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${HUB_BADGE_CLASS[hub.category || 'shelter'] || HUB_BADGE_CLASS['shelter']}`}>
                        {(hub.category || 'shelter').toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-[11px] space-y-1.5">
                  <p className="font-bold text-gray-800">Select City Deployment</p>
                  <p className="text-[10px] text-gray-400">
                    Please select a city deployment in the top-right, or click &quot;⚡ Emergency Evacuate&quot; to automatically view shelters strictly for your city.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── ROUTE DETAILS / ACCORDION CARDS ── */}
      <div className="p-4 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">

        {/* Loading Spinner */}
        {isLoadingORS && (
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl animate-pulse">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
            <span className="text-[11px] font-bold text-emerald-800">
              Evaluating Safety Database & OSRM paths…
            </span>
          </div>
        )}

        {orsError && !isLoadingORS && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-[11px] font-semibold text-red-800">{orsError}</span>
          </div>
        )}

        {!isLoadingORS && !orsError && orsRoutes.length === 0 && (
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-2.5 animate-in fade-in duration-150">
            <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0 mt-0.5">
              📍
            </div>
            <div>
              <p className="text-[12px] font-bold text-blue-900">
                {!cityId
                  ? 'Select City of Deployment'
                  : !originCoords && !destHub
                  ? 'Plan your safe evacuation'
                  : !originCoords
                  ? 'Type your current location'
                  : 'Choose a destination shelter'}
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                {!cityId
                  ? 'Please select a city of deployment from the top-right dropdown to begin safe route planning.'
                  : !originCoords && !destHub
                  ? 'Type your current location above and choose a destination shelter to calculate 3 ranked routes.'
                  : !originCoords
                  ? 'Type your area, landmark, or click "Use GPS" above.'
                  : 'Select a verified relief shelter or hospital from the dropdown above.'}
              </p>
            </div>
          </div>
        )}

        {/* AI Driver Safety Briefing Card */}
        {aiBriefing && (
          <div className="p-3.5 bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 rounded-2xl shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-emerald-950 font-extrabold text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>JalRakshak AI Driver Safety Brief</span>
              </div>
              {avoidPolygonsActive && (
                <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-950 border border-emerald-300">
                  Proactive Detour Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-800 leading-relaxed font-medium">
              {aiBriefing}
            </p>
          </div>
        )}

        {/* 3 Ranked Route Cards */}
        {orsRoutes.map((route, idx) => {
          const isSelected = selectedRouteIdx === idx;
          const safetyScore = route.safetyScore ?? 0;
          const timeScore   = (route as any).timeScore   ?? null;
          const distScore   = (route as any).distanceScore ?? null;
          const finalScore  = (route as any).finalScore  ?? null;
          const why         = (route as any).whyRecommended ?? null;
          const riskCat = route.riskCategory ?? 'moderate';
          const riskLabel = route.riskLabel ?? '🟡 Balanced Route';

          return (
            <div
              key={route.id || idx}
              onClick={() => handleSelectRouteCard(idx)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Top Row: rank badge + time/dist + label */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white text-[11px] font-extrabold shrink-0 mt-0.5 shadow-sm ${
                    riskCat === 'safe'
                      ? 'bg-emerald-600'
                      : riskCat === 'moderate'
                      ? 'bg-amber-500'
                      : 'bg-rose-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`font-extrabold text-[18px] leading-tight ${
                        isSelected ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {fmt(route.durationMin)}
                      </span>
                      <span className="text-[13px] font-bold text-gray-500">{route.distanceKm} km</span>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-800 mt-0.5">{route.name}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                    riskCat === 'safe'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : riskCat === 'moderate'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {riskLabel}
                  </span>
                  {finalScore !== null && (
                    <div className="mt-1 font-mono text-[10px] font-bold text-right">
                      <span className="text-gray-400">Score: </span>
                      <span className={finalScore >= 70 ? 'text-emerald-600' : finalScore >= 45 ? 'text-amber-600' : 'text-rose-600'}>
                        {finalScore}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Score breakdown strip */}
              {timeScore !== null && (
                <div className="mt-2 flex items-center gap-2 text-[9px] font-bold text-gray-500">
                  <div className={`flex items-center gap-1 ${
                    safetyScore >= 80 ? 'text-emerald-700' : safetyScore >= 50 ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    <span>🛡 Safety {safetyScore}%</span>
                  </div>
                  <span className="text-gray-300">·</span>
                  <span className="text-blue-600">⏱ Time {timeScore}%</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-violet-600">📍 Dist {distScore}%</span>
                </div>
              )}

              {/* Why recommended */}
              {why && (
                <div className={`mt-2 px-2.5 py-1.5 rounded-xl text-[10px] leading-relaxed ${
                  riskCat === 'safe'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : riskCat === 'moderate'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {why}
                </div>
              )}

              {/* Safety markers / hazards detected along this route */}
              {route.safetyMarkers && route.safetyMarkers.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-gray-200 text-[10px] space-y-1">
                  <span className="font-extrabold text-gray-500 uppercase text-[8px] tracking-wider block">
                    ⚠️ Hazards on this corridor:
                  </span>
                  {route.safetyMarkers.map((m, mIdx) => (
                    <div key={mIdx} className="flex items-center gap-1.5 text-rose-700 font-semibold bg-rose-50/80 px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="truncate">{m.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {isSelected && (
                <div className="mt-2 pt-1.5 border-t border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-950">Active Path On Map</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">Selected ✓</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Turn-by-Turn Navigation Accordion */}
        {activeRoute && activeRoute.steps.length > 0 && (
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
            <button
              onClick={() => setIsStepsExpanded(!isStepsExpanded)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-[12px] font-bold text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <CornerUpRight className="w-4 h-4 text-emerald-600" />
                <span>Turn-by-Turn Navigation ({activeRoute.steps.length} steps)</span>
              </span>
              {isStepsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {isStepsExpanded && (
              <div className="border-t border-gray-200 bg-white p-2 space-y-1.5 max-h-44 overflow-y-auto">
                {activeRoute.steps.map((step: any, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-emerald-50/50 text-[11px]">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900">{step.instruction}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {step.distanceKm} km · {step.durationMin} min
                        {step.name && step.name !== '-' && <span className="text-emerald-700 ml-1 font-semibold">{step.name}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons: GPX, Save as PDF (real map), Simulate Drive */}
        {activeRoute && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportGPX}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 text-[11px] font-bold flex items-center justify-center gap-1.5 border border-gray-200 shadow-sm transition-colors cursor-pointer"
                title="Download GPX file — import into OsmAnd, Garmin, Google Maps offline"
              >
                <Download className="w-3.5 h-3.5 text-gray-600" />
                <span>GPX (GPS apps)</span>
              </button>
              <button
                onClick={() => {
                  const route = orsRoutes[selectedRouteIdx];
                  if (!route?.coordinates?.length) return;
                  const lats = route.coordinates.map(([, lat]) => lat);
                  const lngs = route.coordinates.map(([lng]) => lng);
                  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
                  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
                  const centerLat = (minLat + maxLat) / 2;
                  const centerLng = (minLng + maxLng) / 2;
                  const coordsForLeaflet = route.coordinates.map(([lng, lat]) => [lat, lng]);
                  const stepsHtml = (route.steps || []).map((s: any, i: number) =>
                    `<tr><td class="sn">${i + 1}</td><td><b>${s.instruction}</b>${s.name && s.name !== '-' ? `<span class="rname">${s.name}</span>` : ''}</td><td class="num">${s.distanceKm} km</td><td class="num">${s.durationMin} min</td></tr>`
                  ).join('');

                  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>JalRakshak Route — ${route.name || 'Safe Evacuation'}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #fff; color: #1e293b; }
  .header { display: flex; align-items: center; gap: 14px; padding: 10px 14px; background: linear-gradient(135deg, #059669, #0284c7); color: #fff; border-radius: 8px; margin-bottom: 10px; }
  .header-icon { font-size: 28px; }
  .header h1 { font-size: 15px; font-weight: 900; }
  .header p { font-size: 10px; opacity: .85; margin-top: 2px; }
  .badge { display: inline-block; background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.4); border-radius: 12px; padding: 1px 7px; font-size: 9px; font-weight: 800; margin-left: 6px; }
  .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 10px; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center; }
  .stat b { display: block; font-size: 18px; font-weight: 900; color: #059669; }
  .stat small { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; }
  #map { width: 100%; height: 320px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 10px; }
  .section-title { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #f1f5f9; color: #475569; font-size: 9px; font-weight: 700; padding: 5px 8px; text-align: left; text-transform: uppercase; letter-spacing: .05em; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  td.sn { width: 24px; text-align: center; font-weight: 800; color: #059669; }
  td.num { width: 52px; text-align: right; color: #64748b; }
  td b { color: #0f172a; font-weight: 700; }
  .rname { display: inline-block; margin-left: 5px; color: #0891b2; font-size: 9px; }
  tr:hover td { background: #f8fafc; }
  footer { margin-top: 10px; text-align: center; font-size: 9px; color: #94a3b8; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="no-print" style="background:#1e293b;color:#fff;padding:10px 16px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-radius:8px">
  <span>🖨️ JalRakshak — Route Map Print Preview</span>
  <button onclick="window.print()" style="background:#059669;color:#fff;border:none;border-radius:8px;padding:7px 18px;font-weight:800;font-size:12px;cursor:pointer">💾 Save as PDF</button>
</div>
<div class="header">
  <div class="header-icon">🛡️</div>
  <div>
    <h1>${route.name || 'Safe Evacuation Route'}<span class="badge">${route.safetyScore || 0}% SAFE</span></h1>
    <p>${originQuery || 'Origin'} → ${destHub?.name || 'Safe Shelter'} &nbsp;·&nbsp; ${destHub?.address || ''}</p>
  </div>
</div>
<div class="stats">
  <div class="stat"><b>${route.distanceKm} km</b><small>Distance</small></div>
  <div class="stat"><b>${route.durationMin} min</b><small>Est. Duration</small></div>
  <div class="stat"><b>${route.safetyScore || 0}%</b><small>Safety Score</small></div>
  <div class="stat"><b>${route.coordinates.length}</b><small>Track Points</small></div>
</div>
<div id="map"></div>
<div class="section-title">Turn-by-Turn Directions</div>
<table>
  <thead><tr><th>#</th><th>Instruction</th><th>Dist</th><th>Time</th></tr></thead>
  <tbody>${stepsHtml || '<tr><td colspan="4" style="color:#94a3b8;padding:12px;text-align:center">No turn-by-turn data for this route.</td></tr>'}</tbody>
</table>
<footer>Generated by JalRakshak Flood Emergency Router · ${new Date().toLocaleString()} · Map data © OpenStreetMap contributors</footer>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 18
  }).addTo(map);
  var coords = ${JSON.stringify(coordsForLeaflet)};
  var poly = L.polyline(coords, { color: '#16a34a', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
  // White casing underlay
  L.polyline(coords, { color: '#fff', weight: 9, opacity: 0.6, lineCap: 'round', lineJoin: 'round' }).addTo(map);
  L.polyline(coords, { color: '#16a34a', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);
  // Start marker
  L.circleMarker(coords[0], { radius: 9, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map).bindPopup('<b>📍 Start</b><br>${(originQuery || 'Origin').replace(/'/g, "\\'")}');
  // End marker
  L.circleMarker(coords[coords.length-1], { radius: 9, color: '#fff', weight: 3, fillColor: '#dc2626', fillOpacity: 1 }).addTo(map).bindPopup('<b>🏥 Shelter</b><br>${(destHub?.name || 'Safe Shelter').replace(/'/g, "\\'")}');
  map.fitBounds(poly.getBounds(), { padding: [28, 28] });
  // Auto-open print after map loads
  map.once('load', function(){ });
<\/script>
</body></html>`;

                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(html);
                    win.document.close();
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 border border-blue-500 shadow-sm transition-colors cursor-pointer"
                title="Open print-ready map with OSM tiles and save as PDF"
              >
                <Download className="w-3.5 h-3.5 text-blue-200" />
                <span>Save as PDF</span>
              </button>
            </div>
            <button
              onClick={onToggleSimulation}
              className={`w-full py-2.5 px-3 rounded-2xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                isSimulating
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              <Navigation className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Stop Driving' : 'Simulate Drive'}</span>
            </button>
          </div>
        )}

      </div>
      {/* ── FOOTER CAPTION ── */}
      <div className="px-4 py-2.5 bg-gray-50/70 border-t border-gray-100 text-center">
        <p className="text-[10px] text-gray-400 font-semibold">
          100% open-source safety routing via OpenStreetMap & OSRM
        </p>
      </div>

    </div>
  );
};
