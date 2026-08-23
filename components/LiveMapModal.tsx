'use client';

import React, { useState } from 'react';
import { X, MapPin, Layers, Radio, Shield, AlertTriangle, Droplets, RefreshCw, Filter, Compass } from 'lucide-react';

interface LiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveMapModal: React.FC<LiveMapModalProps> = ({ isOpen, onClose }) => {
  const [selectedWard, setSelectedWard] = useState('Ward 112 — T. Nagar');
  const [rainfallRate, setRainfallRate] = useState(65); // mm/hr
  const [drainageStatus, setDrainageStatus] = useState('78% Capacity');
  const [activeLayer, setActiveLayer] = useState<'flood' | 'drainage' | 'elevation'>('flood');

  if (!isOpen) return null;

  const wards = [
    { name: 'Ward 112 — T. Nagar', risk: 'High Risk', depth: '35 cm', drainage: '88% Full', color: 'bg-red-500' },
    { name: 'Ward 118 — Mylapore', risk: 'Moderate', depth: '18 cm', drainage: '62% Full', color: 'bg-amber-500' },
    { name: 'Ward 173 — Velachery', risk: 'Severe Surge', depth: '52 cm', drainage: '98% Full', color: 'bg-red-600' },
    { name: 'Ward 142 — Kodambakkam', risk: 'Low Risk', depth: '6 cm', drainage: '40% Full', color: 'bg-emerald-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Box */}
      <div className="w-full max-w-[1280px] h-[92vh] bg-[#090E15] border border-white/15 rounded-[36px] overflow-hidden text-white flex flex-col shadow-2xl relative">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#151A20]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F56A00] flex items-center justify-center font-extrabold text-white">
              <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] sm:text-[20px] font-extrabold text-white">
                  JalRakshak Urban Live Map — Chennai Metro
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Live Rainfall
                </span>
              </div>
              <p className="text-[12px] text-white/60 font-medium">
                Street-level hydrodynamic forecast & drainage coupling simulation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content (Split view) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Map Simulation Canvas Area */}
          <div className="lg:col-span-8 bg-[#050A0F] relative overflow-hidden flex flex-col justify-between p-6">
            
            {/* Map Top Controls Overlay */}
            <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
              {/* Layer Switches */}
              <div className="glass-pill p-1 rounded-full flex items-center gap-1 border border-white/20">
                <button
                  onClick={() => setActiveLayer('flood')}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                    activeLayer === 'flood' ? 'bg-[#F56A00] text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Water Depth
                </button>
                <button
                  onClick={() => setActiveLayer('drainage')}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                    activeLayer === 'drainage' ? 'bg-[#F56A00] text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Drainage Flow
                </button>
                <button
                  onClick={() => setActiveLayer('elevation')}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                    activeLayer === 'elevation' ? 'bg-[#F56A00] text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Terrain DEM
                </button>
              </div>

              {/* Sensor Live Refresh */}
              <div className="flex items-center gap-2 glass-pill px-3.5 py-1.5 rounded-full text-[12px] text-white/80 border border-white/15">
                <RefreshCw className="w-3.5 h-3.5 text-[#F56A00] animate-spin" />
                <span>Sensors Syncing (10s)</span>
              </div>
            </div>

            {/* Stylized Interactive Map Simulation Layer */}
            <div className="absolute inset-0 flex items-center justify-center opacity-90 pointer-events-none">
              
              {/* Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px]" />

              {/* Simulated River Vector Path */}
              <svg className="absolute inset-0 w-full h-full opacity-40">
                <path
                  d="M -100 200 Q 300 150, 600 400 T 1200 600"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="32"
                  strokeLinecap="round"
                />
              </svg>

              {/* Ward Interactive Map Hotspot Pins */}
              <div className="relative w-full h-full p-12 flex flex-wrap items-center justify-around pointer-events-auto">
                {wards.map((w, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedWard(w.name)}
                    className={`cursor-pointer group flex flex-col items-center transition-all ${
                      selectedWard === w.name ? 'scale-110 z-20' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="glass-card p-3 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2.5">
                      <span className={`w-3 h-3 rounded-full ${w.color} animate-pulse`} />
                      <div>
                        <p className="text-[12px] font-extrabold text-white">{w.name.split('—')[1]}</p>
                        <p className="text-[10px] text-white/70 font-semibold">{w.depth} water depth</p>
                      </div>
                    </div>
                    <div className="w-0.5 h-6 bg-white/40" />
                    <div className="w-4 h-4 rounded-full bg-[#F56A00] ring-4 ring-[#F56A00]/30 animate-pulse" />
                  </div>
                ))}
              </div>

            </div>

            {/* Map Bottom Legend Controls */}
            <div className="relative z-10 glass-card p-4 rounded-2xl border border-white/15 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-[12px] font-bold text-white/70">Risk Gradient:</span>
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" /> Safe
                  <span className="w-3 h-3 rounded-full bg-amber-500 ml-2" /> Moderate
                  <span className="w-3 h-3 rounded-full bg-red-600 ml-2" /> Critical Surge
                </div>
              </div>

              <div className="text-[12px] text-white/80 font-mono">
                Lat: 13.0827° N | Lon: 80.2707° E
              </div>
            </div>

          </div>

          {/* Sidebar Controls & Analytics */}
          <div className="lg:col-span-4 bg-[#151A20] p-6 border-l border-white/10 flex flex-col justify-between overflow-y-auto">
            
            <div>
              {/* Selected Ward Details */}
              <div className="mb-6">
                <span className="text-[11px] text-[#F56A00] font-extrabold uppercase tracking-widest block mb-1">
                  Active Ward Inspection
                </span>
                <h3 className="text-[22px] font-extrabold text-white mb-2">
                  {selectedWard}
                </h3>
                <div className="p-4 rounded-2xl bg-[#090E15] border border-white/10 space-y-3">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-white/60">Predicted Inundation Depth</span>
                    <span className="font-extrabold text-[#F56A00]">35 cm (Intersection level)</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-white/60">Drainage Sump Flow</span>
                    <span className="font-extrabold text-amber-400">88% Capacity (Bottleneck)</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-white/60">Alert Level</span>
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[11px]">
                      HIGH ALERT
                    </span>
                  </div>
                </div>
              </div>

              {/* Simulated Rainfall Rate Adjuster */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[13px] font-bold text-white flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-[#F56A00]" />
                    Simulate Precipitation (mm/hr)
                  </label>
                  <span className="text-[14px] font-extrabold text-[#F56A00]">
                    {rainfallRate} mm/hr
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={rainfallRate}
                  onChange={(e) => setRainfallRate(Number(e.target.value))}
                  className="w-full accent-[#F56A00] cursor-pointer"
                />
                <p className="text-[11px] text-white/50 mt-1">
                  Slide to simulate torrential downpour & drainage backflow.
                </p>
              </div>

              {/* Action Dispatch Simulation */}
              <div className="p-4 rounded-2xl bg-[#F56A00]/10 border border-[#F56A00]/30 mb-6">
                <div className="flex items-center gap-2 text-[#F56A00] font-extrabold text-[13px] mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Automated Early Warning
                </div>
                <p className="text-[12px] text-white/80 leading-relaxed mb-3">
                  Dispatch advisory to 14,200 residents in T. Nagar ward & trigger storm drain pumping station #4.
                </p>
                <button
                  onClick={() => alert(`Early warning broadcast initiated for ${selectedWard}!`)}
                  className="w-full py-2.5 rounded-full bg-[#F56A00] text-white font-extrabold text-[13px] hover:bg-[#FF7200] transition-colors"
                >
                  Broadcast Live Advisory
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-center text-[12px] text-white/50">
              Powered by JalRakshak Urban Hydro-Terrain AI Engine
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
