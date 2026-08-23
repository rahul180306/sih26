'use client';

import React, { useState } from 'react';
import { X, CloudRain, Cpu, Network, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMap: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose, onOpenMap }) => {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      icon: CloudRain,
      title: '1. Rainfall Radar Nowcasting',
      subtitle: 'X-Band Doppler Radar + Satellite Feeds',
      description: 'Ingests high-frequency micro-radar observations and Doppler satellite reflectivity to predict cloud bursts and localized rain intensities up to 3 hours ahead with 100m spatial resolution.',
      metrics: ['100m spatial accuracy', '3-hour lead time', '5-minute update cycle'],
    },
    {
      icon: Network,
      title: '2. Hydrodynamic Drainage Coupling',
      subtitle: 'Real-time Sump & Pipe Flow Telemetry',
      description: 'Couples surface overland flow dynamics with underground stormwater pipe networks, culverts, and pumping station telemetry to calculate exact clogging and backflow risks.',
      metrics: ['Physical pipe modeling', 'Live sensor telemetry', 'Backflow prediction'],
    },
    {
      icon: Cpu,
      title: '3. AI Terrain & Inundation Physics',
      subtitle: 'Sub-Meter DEM + Neural Physics Engine',
      description: 'Runs physics-informed AI models on high-resolution terrain elevation models (DEM) to simulate exact street, lane, and intersection water accumulation depths in seconds.',
      metrics: ['Physics-informed AI', 'Sub-second inference', 'Intersection-level alerts'],
    },
    {
      icon: ShieldCheck,
      title: '4. Actionable Response Dispatch',
      subtitle: 'Automated Citizen & Civic Emergency Alerts',
      description: 'Triggers targeted SMS warnings to vulnerable neighborhoods, automates storm-pump activation commands, and reroutes traffic away from submerged underpasses.',
      metrics: ['Automated pump activation', 'Geo-fenced SMS advisories', 'Traffic rerouting'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      
      <div className="w-full max-w-[1000px] bg-[#090E15] border border-white/15 rounded-[36px] overflow-hidden text-white flex flex-col shadow-2xl relative">
        
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#151A20]">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#F56A00] block mb-0.5">
              Technology Architecture
            </span>
            <h2 className="text-[22px] sm:text-[24px] font-extrabold text-white">
              How JalRakshak Urban Works
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-8 max-h-[80vh] overflow-y-auto">
          
          {/* Step Selection Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = activeStep === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isActive
                      ? 'bg-[#F56A00] border-[#F56A00] text-white shadow-lg shadow-orange-950/40'
                      : 'bg-[#151A20] border-white/10 text-white/70 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Icon className="w-6 h-6 mb-2" />
                  <p className="text-[13px] font-extrabold leading-tight">{s.title}</p>
                </button>
              );
            })}
          </div>

          {/* Active Step Highlight Detail */}
          <div className="bg-[#151A20] border border-white/15 rounded-[28px] p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-8">
              <span className="text-[12px] font-extrabold text-[#F56A00] uppercase tracking-wider block mb-1">
                {steps[activeStep].subtitle}
              </span>
              <h3 className="text-[26px] font-extrabold text-white mb-3">
                {steps[activeStep].title}
              </h3>
              <p className="text-[15px] text-white/80 font-medium leading-relaxed mb-6">
                {steps[activeStep].description}
              </p>

              <div className="flex flex-wrap gap-2">
                {steps[activeStep].metrics.map((m, i) => (
                  <span
                    key={i}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[12px] font-bold text-white flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F56A00]" />
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="md:col-span-4 bg-[#090E15] p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#F56A00]/20 border border-[#F56A00]/40 flex items-center justify-center text-[#F56A00] mb-3">
                {React.createElement(steps[activeStep].icon, { className: 'w-8 h-8 stroke-[2.2]' })}
              </div>
              <span className="text-[13px] font-extrabold text-white">
                Module {activeStep + 1} of 4 Active
              </span>
              <span className="text-[11px] text-white/60 mt-1">
                Sub-Second Precision Engine
              </span>
            </div>

          </div>

          {/* Bottom Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
            <p className="text-[13px] text-white/60">
              Ready to deploy JalRakshak Urban in your smart city?
            </p>

            <button
              onClick={() => {
                onClose();
                onOpenMap();
              }}
              className="px-6 py-3 rounded-full bg-[#F56A00] text-white font-extrabold text-[14px] flex items-center gap-2 hover:bg-[#FF7200] transition-all shadow-lg"
            >
              <span>Launch Live Simulation Map</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
