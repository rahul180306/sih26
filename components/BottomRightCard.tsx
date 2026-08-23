'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface BottomRightCardProps {
  onLearnMore?: () => void;
}

export const BottomRightCard: React.FC<BottomRightCardProps> = ({ onLearnMore }) => {
  return (
    <div 
      onClick={onLearnMore}
      className="w-full h-full bg-[#0C1017] rounded-[28px] sm:rounded-[34px] p-4 sm:p-5 xl:p-6 text-white relative overflow-hidden group cursor-pointer shadow-2xl border border-white/10 flex items-center"
    >
      {/* Background Dark Rainy Landscape Image */}
      <div 
        className="absolute inset-0 opacity-25 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80')`
        }}
      />

      {/* Dark Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0C1017] via-[#0C1017]/85 to-transparent" />

      {/* Content Layout */}
      <div className="relative z-10 flex items-center gap-4 sm:gap-5 w-full">
        
        {/* Large Orange Shield Icon Circle */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 xl:w-18 xl:h-18 rounded-full bg-[#EB5A00] flex items-center justify-center shrink-0 text-white shadow-xl shadow-orange-950/50 group-hover:scale-105 transition-transform">
          <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 xl:w-9 xl:h-9 text-white stroke-[2.2]" />
        </div>

        {/* Text Content */}
        <div className="flex flex-col pr-1 sm:pr-2">
          <h3 className="text-[17px] sm:text-[20px] xl:text-[22px] font-bold tracking-tight text-white leading-tight mb-1">
            Smarter Decisions. Safer Cities.
          </h3>
          <p className="text-[11px] sm:text-[12px] xl:text-[13px] text-white/70 font-normal leading-relaxed max-w-[420px]">
            Empowering planners, responders, and communities with actionable flood intelligence.
          </p>
        </div>

      </div>
    </div>
  );
};


