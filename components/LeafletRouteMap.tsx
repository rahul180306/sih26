'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { RouteAlternativeItem } from '@/app/api/routing/directions/route';
import { Loader2, AlertTriangle, Crosshair, ShieldCheck } from 'lucide-react';

interface LeafletRouteMapProps {
  cityId?: string;
  origin: { lat: number; lng: number; label: string } | null;
  destination: { lat: number; lng: number; label: string } | null;
  routes: RouteAlternativeItem[];
  selectedRouteIdx: number;
  onSelectRouteIdx: (idx: number) => void;
  isLoading: boolean;
  error: string | null;
  onLocateUser?: () => void;
  isLocating?: boolean;
  isSimulating?: boolean;
  vehicle?: string;
}

const CITY_COORDS: Record<string, [number, number]> = {
  chennai: [13.0827, 80.2707],
  mumbai: [19.0760, 72.8777],
  bengaluru: [12.9716, 77.5946],
  delhi: [28.6139, 77.2090],
};

const INDIA_LEAFLET_CENTER: [number, number] = [21.5, 82.0];
const INDIA_LEAFLET_ZOOM = 4.8;

export const LeafletRouteMap: React.FC<LeafletRouteMapProps> = ({
  cityId,
  origin,
  destination,
  routes,
  selectedRouteIdx,
  onSelectRouteIdx,
  isLoading,
  error,
  onLocateUser,
  isLocating,
  isSimulating,
  vehicle = 'car',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylinesRef = useRef<any[]>([]);
  const markersRef = useRef<any[]>([]);
  const simMarkerRef = useRef<any>(null);
  const simIntervalRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // ── Initialize Leaflet Full-Screen Map Instance ─────────────────────────────
  useEffect(() => {
    let map: any = null;
    let isCancelled = false;

    (async () => {
      if (!mapContainerRef.current) return;
      const L = (await import('leaflet')).default;
      if (isCancelled || !mapContainerRef.current) return;

      // On first load with no selected location/city, show full India radar view
      const hasCity = cityId && CITY_COORDS[cityId];
      const initialLat = origin?.lat ?? (hasCity ? CITY_COORDS[cityId][0] : INDIA_LEAFLET_CENTER[0]);
      const initialLng = origin?.lng ?? (hasCity ? CITY_COORDS[cityId][1] : INDIA_LEAFLET_CENTER[1]);
      const initialZoom = origin ? 13 : (hasCity ? 12.5 : INDIA_LEAFLET_ZOOM);

      map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: true,
        minZoom: 4,
      });

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add Clean OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);

      // Invalidate size to guarantee sharp tile alignment
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 200);
    })();

    return () => {
      isCancelled = true;
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // ── Update Markers & Route Polylines when Routes / Origin / Dest change ──────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    (async () => {
      const L = (await import('leaflet')).default;

      // 1. Clear existing polylines and markers
      polylinesRef.current.forEach((pl) => map.removeLayer(pl));
      polylinesRef.current = [];

      markersRef.current.forEach((mk) => map.removeLayer(mk));
      markersRef.current = [];

      const allLatLngs: [number, number][] = [];

      // 2. Add Origin Marker (📍 Current Location)
      if (origin && origin.lat && origin.lng) {
        const originLatLng: [number, number] = [origin.lat, origin.lng];
        allLatLngs.push(originLatLng);

        const originIcon = L.divIcon({
          className: 'custom-leaflet-origin-icon',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <div style="
                width: 30px; height: 30px; border-radius: 50%;
                background: #1A73E8; border: 3.5px solid #ffffff;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 16px rgba(26, 115, 232, 0.65), 0 2px 6px rgba(0,0,0,0.3);
              ">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
              </div>
              <div style="
                margin-top: 3px; background: #1A73E8; color: #ffffff;
                font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 10px;
                white-space: nowrap; box-shadow: 0 3px 10px rgba(0,0,0,0.35);
                border: 1.5px solid #ffffff;
              ">
                📍 Your Location
              </div>
            </div>
          `,
          iconSize: [100, 55],
          iconAnchor: [50, 15],
        });

        const oMarker = L.marker(originLatLng, { icon: originIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
              <strong style="color: #1A73E8; font-size: 13px;">📍 Starting Point</strong><br/>
              <span style="color: #475569; font-weight: 600;">${origin.label || 'Your Current Location'}</span><br/>
              <span style="font-family: monospace; font-size: 10px; color: #94a3b8;">${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}</span>
            </div>
          `);

        markersRef.current.push(oMarker);
      }

      // 3. Add Destination Marker (🏁 Shelter / Hospital)
      if (destination && destination.lat && destination.lng) {
        const destLatLng: [number, number] = [destination.lat, destination.lng];
        allLatLngs.push(destLatLng);

        const shortDestLabel = destination.label
          ? destination.label.split(',')[0].replace('Govt General', 'Govt').trim()
          : 'Shelter';

        const destIcon = L.divIcon({
          className: 'custom-leaflet-dest-icon',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
              <div style="filter: drop-shadow(0 4px 12px rgba(0,0,0,0.45));">
                <svg width="34" height="40" viewBox="0 0 24 24" fill="#EA4335" stroke="#ffffff" stroke-width="1.5">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div style="
                margin-top: -6px; background: #EA4335; color: #ffffff;
                font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 12px;
                white-space: nowrap; box-shadow: 0 3px 10px rgba(0,0,0,0.35);
                border: 1.5px solid #ffffff; max-width: 220px; overflow: hidden; text-overflow: ellipsis;
              ">
                🏁 ${shortDestLabel}
              </div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const dMarker = L.marker(destLatLng, { icon: destIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
              <strong style="color: #EA4335; font-size: 13px;">🏁 Safe Evacuation Shelter</strong><br/>
              <span style="color: #1e293b; font-weight: 700;">${destination.label}</span><br/>
              <span style="font-family: monospace; font-size: 10px; color: #94a3b8;">${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}</span>
            </div>
          `);

        markersRef.current.push(dMarker);
      }

      // 4. Render All Alternative Route Polylines
      if (routes && routes.length > 0) {
        // Draw unselected routes first, selected route on top
        const sortedIndices = routes.map((_, i) => i).sort((a, b) => (a === selectedRouteIdx ? 1 : -1));

        sortedIndices.forEach((rIdx) => {
          const r = routes[rIdx];
          if (!r.coordinates || r.coordinates.length === 0) return;

          // Convert ORS [lng, lat] to Leaflet [lat, lng]
          const latLngs: [number, number][] = r.coordinates.map(([lng, lat]) => [lat, lng]);
          latLngs.forEach(ll => allLatLngs.push(ll));

          const isSelected = rIdx === selectedRouteIdx;
          const color = r.lineColor || (rIdx === 0 ? '#10B981' : (rIdx === 1 ? '#F59E0B' : '#EF4444'));

          // White Casing Underlay for selected route
          if (isSelected) {
            const casing = L.polyline(latLngs, {
              color: '#ffffff',
              weight: 11,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(map);
            polylinesRef.current.push(casing);
          }

          // Main Route Line
          const polyline = L.polyline(latLngs, {
            color: color,
            weight: isSelected ? 7.5 : 4.5,
            opacity: isSelected ? 1.0 : 0.6,
            dashArray: isSelected ? undefined : '6, 6',
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          polyline.on('click', () => {
            onSelectRouteIdx(rIdx);
          });

          polyline.bindTooltip(`
            <div style="font-family: sans-serif; font-size: 11px; font-weight: 800; color: #0f172a;">
              ${r.riskLabel || `Route ${rIdx + 1}`} (${r.safetyScore || 90}% Safe)<br/>
              <span style="color: #64748b;">${r.durationMin} min · ${r.distanceKm} km</span>
            </div>
          `, { sticky: true });

          polylinesRef.current.push(polyline);
        });

        // 5. Render Safety Database Hazard Incident Markers
        routes.forEach((r) => {
          if (r.safetyMarkers && r.safetyMarkers.length > 0) {
            r.safetyMarkers.forEach((h: any) => {
              // Clean short hazard name: e.g. "T. Nagar Subway", "Milan Subway", "Kurla West"
              const cleanHazName = h.name
                .replace(' Underpass', ' Subway')
                .replace(' Overflow', '')
                .replace(' (Mithi River Bank)', '')
                .trim();

              const hazIcon = L.divIcon({
                className: 'custom-leaflet-hazard-icon',
                html: `
                  <div style="
                    display: inline-flex; align-items: center; gap: 5px;
                    background: #EF4444; color: #ffffff;
                    padding: 4px 10px; border-radius: 14px;
                    font-size: 11px; font-weight: 800;
                    border: 2px solid #ffffff;
                    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.55);
                    cursor: pointer; transform: translate(-50%, -50%);
                    white-space: nowrap;
                  ">
                    <span>⚠️</span>
                    <span>${cleanHazName}</span>
                  </div>
                `,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
              });

              const hazMarker = L.marker([h.lat, h.lng], { icon: hazIcon })
                .addTo(map)
                .bindPopup(`
                  <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; max-width: 230px;">
                    <strong style="color: #EF4444; font-size: 13px;">⚠️ Flood Hazard Zone</strong><br/>
                    <strong style="color: #0f172a; font-size: 12px;">${h.name}</strong><br/>
                    <span style="color: #475569; font-size: 11px;">${h.description}</span><br/>
                    <div style="margin-top: 5px; padding: 3px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; color: #B91C1C; font-size: 10px; font-weight: 700;">
                      Severity: ${h.riskLevel?.toUpperCase() || 'CRITICAL'} · Depth: ${h.waterDepthMeters ? `${h.waterDepthMeters}m` : 'Flooded'}
                    </div>
                  </div>
                `);

              markersRef.current.push(hazMarker);
            });
          }
        });
      }

      // 6. Automatic Fit Bounds with smooth padding (Offset for left card console)
      if (allLatLngs.length > 0) {
        try {
          const bounds = L.latLngBounds(allLatLngs);
          map.fitBounds(bounds, {
            paddingTopLeft: [490, 80],
            paddingBottomRight: [80, 80],
            maxZoom: 15,
            animate: true,
          });
        } catch {
          // Ignored
        }
      } else {
        try {
          if (cityId && CITY_COORDS[cityId]) {
            map.flyTo(CITY_COORDS[cityId], 12.5, { animate: true, duration: 1.2 });
          } else {
            map.flyTo(INDIA_LEAFLET_CENTER, INDIA_LEAFLET_ZOOM, { animate: true, duration: 1.2 });
          }
        } catch {
          // Ignored
        }
      }
    })();
  }, [
    cityId,
    origin?.lat,
    origin?.lng,
    origin?.label,
    destination?.lat,
    destination?.lng,
    destination?.label,
    routes,
    selectedRouteIdx,
    mapReady,
    onSelectRouteIdx,
  ]);

  // ── 6. Real-Time Turn-by-Turn Vehicle Navigation Driving Simulation ──────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (simMarkerRef.current) {
      map.removeLayer(simMarkerRef.current);
      simMarkerRef.current = null;
    }

    if (!isSimulating) return;

    const activeRoute = routes[selectedRouteIdx];
    if (!activeRoute || !activeRoute.coordinates || activeRoute.coordinates.length < 2) return;

    // Convert ORS [lng, lat] to Leaflet [lat, lng]
    const path: [number, number][] = activeRoute.coordinates.map(([lng, lat]) => [lat, lng]);
    let currentStep = 0;

    const vehicleEmoji = vehicle === 'ambulance' ? '🚑' : vehicle === 'bus' ? '🚌' : vehicle === 'bike' ? '🛵' : '🚗';

    (async () => {
      const L = (await import('leaflet')).default;
      if (!mapInstanceRef.current || !isSimulating) return;

      const vehicleIcon = L.divIcon({
        className: 'custom-leaflet-vehicle-sim',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
            <div style="
              position: absolute; width: 44px; height: 44px; border-radius: 50%;
              background: rgba(16, 185, 129, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              width: 36px; height: 36px; border-radius: 50%;
              background: #059669; border: 3px solid #ffffff;
              box-shadow: 0 4px 18px rgba(5, 150, 105, 0.6);
              display: flex; align-items: center; justify-content: center;
              font-size: 18px; color: #ffffff; z-index: 10;
            ">
              ${vehicleEmoji}
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const carMarker = L.marker(path[0], { icon: vehicleIcon, zIndexOffset: 2000 }).addTo(map);
      simMarkerRef.current = carMarker;

      // Pan to start
      map.panTo(path[0], { animate: true, duration: 0.5 });

      simIntervalRef.current = setInterval(() => {
        currentStep += 1;
        if (currentStep >= path.length - 1) {
          // Reached destination: place at exact end position, pan to destination, and stop simulation cleanly
          const destPos = path[path.length - 1];
          if (carMarker) {
            carMarker.setLatLng(destPos);
          }
          map.panTo(destPos, { animate: true, duration: 0.5 });
          if (simIntervalRef.current) {
            clearInterval(simIntervalRef.current);
            simIntervalRef.current = null;
          }
          return;
        }

        const nextPos = path[currentStep];
        if (carMarker) {
          carMarker.setLatLng(nextPos);
          if (currentStep % 4 === 0) {
            map.panTo(nextPos, { animate: true, duration: 0.35 });
          }
        }
      }, 300);
    })();

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      if (simMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(simMarkerRef.current);
        simMarkerRef.current = null;
      }
    };
  }, [isSimulating, routes, selectedRouteIdx, mapReady, vehicle]);

  return (
    <div className="relative w-full h-full min-h-[480px] bg-slate-100 font-sans select-none overflow-hidden">
      
      {/* ── Leaflet Full-Screen Map Container (always visible) ── */}
      <div
        ref={mapContainerRef}
        id="leaflet-route-map-fullscreen"
        className="w-full h-full z-0"
        style={{ height: '100%', minHeight: '480px', width: '100%' }}
      />

      {/* ── Top-Right Map Legend ── */}
      <div className="absolute top-18 right-4 z-[1000] bg-white/95 backdrop-blur-md px-3.5 py-3 rounded-2xl shadow-xl border border-gray-200 text-[11px] font-semibold text-gray-800 space-y-1.5 max-w-[180px] pointer-events-auto">
        <div className="text-[9px] uppercase font-extrabold text-gray-400 tracking-wider border-b border-gray-100 pb-1.5 flex items-center justify-between">
          <span>Route Safety</span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
          <span className="text-[11px] text-gray-900 font-bold truncate">Safest Route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-sm" />
          <span className="text-[11px] text-gray-700 font-medium truncate">Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-sm" />
          <span className="text-[11px] text-gray-700 font-medium truncate">Higher-Risk</span>
        </div>
        <div className="border-t border-gray-100 pt-1.5 flex items-center justify-between text-[10px] text-gray-500">
          <span>📍 Start</span>
          <span>🏁 Shelter</span>
          <span>⚠️ Hazard</span>
        </div>
      </div>

      {/* ── Small Non-Blocking Loading Badge (bottom-center, map stays visible) ── */}
      {isLoading && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg border border-emerald-200 pointer-events-none">
          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
          <span className="text-[12px] font-bold text-gray-800 whitespace-nowrap">Updating routes with real road data…</span>
        </div>
      )}

      {/* ── Small Non-Blocking Error Badge (shown only when no routes at all) ── */}
      {error && !isLoading && routes.length === 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-rose-50/95 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg border border-rose-200 pointer-events-none">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="text-[12px] font-semibold text-rose-800 whitespace-nowrap">{error}</span>
        </div>
      )}

    </div>
  );
};
