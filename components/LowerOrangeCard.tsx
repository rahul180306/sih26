'use client';

import React from 'react';

export const LowerOrangeCard: React.FC = () => {
  return (
    <div className="w-full sm:w-[240px] md:w-[260px] xl:w-[280px] h-[140px] sm:h-[150px] xl:h-[165px] bg-[#EB5A00] rounded-[24px] xl:rounded-[28px] p-4 sm:p-5 xl:p-6 text-white flex flex-col justify-between shadow-xl relative overflow-hidden group shrink-0">
      
      {/* Target/Radar Concentric Circles Graphic on Left */}
      <div className="absolute -left-6 -bottom-6 w-32 xl:w-36 h-32 xl:h-36 opacity-30 pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-white fill-none" strokeWidth="2">
          <circle cx="50" cy="50" r="45" strokeDasharray="3 3" />
          <circle cx="50" cy="50" r="35" />
          <circle cx="50" cy="50" r="25" />
          <circle cx="50" cy="50" r="15" />
          <circle cx="50" cy="50" r="5" fill="white" />
          <line x1="50" y1="0" x2="50" y2="100" strokeDasharray="2 2" />
          <line x1="0" y1="50" x2="100" y2="50" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* Top Header Label */}
      <div className="flex justify-end relative z-10">
        <span className="text-[10px] xl:text-[11px] font-medium tracking-wide text-white/90">
          Street-Level Accuracy
        </span>
      </div>

      {/* Bottom Text Content */}
      <div className="relative z-10">
        <h3 className="text-[24px] sm:text-[28px] xl:text-[32px] font-extrabold tracking-tight text-white leading-tight mb-0.5">
          Hyperlocal
        </h3>
        <p className="text-[11px] xl:text-[12px] text-white/90 font-medium leading-snug max-w-[200px]">
          Predicting floods at street and intersection level
        </p>
      </div>
    </div>
  );
};

