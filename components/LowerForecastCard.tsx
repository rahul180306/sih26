'use client';

import React from 'react';

export const LowerForecastCard: React.FC = () => {
  return (
    <div className="w-full sm:w-[280px] md:w-[310px] xl:w-[340px] h-[140px] sm:h-[150px] xl:h-[165px] bg-[#171C24] rounded-[24px] xl:rounded-[28px] p-4 sm:p-5 xl:p-6 text-white flex flex-col justify-between shadow-xl border border-white/10 relative overflow-hidden group shrink-0">
      
      {/* Content Container */}
      <div className="flex justify-between items-start h-full">
        
        {/* Left Info Column */}
        <div className="flex flex-col justify-between h-full max-w-[140px]">
          <div>
            <h3 className="text-[22px] sm:text-[25px] xl:text-[28px] font-bold tracking-tight text-white leading-none mb-1">
              0–3 hr
            </h3>
            <span className="text-[11px] xl:text-[12px] font-semibold text-white/90 block mb-0.5">
              Advanced Nowcasting
            </span>
          </div>

          <p className="text-[9px] xl:text-[10px] text-white/60 font-normal leading-tight">
            Up to 3 hours of high resolution forecasts
          </p>
        </div>

        {/* Right Line Chart Graphic */}
        <div className="flex-1 h-full flex flex-col justify-end items-end pl-2 sm:pl-3">
          <div className="w-full h-[75px] sm:h-[85px] xl:h-[90px] relative flex flex-col justify-between pt-1">
            
            {/* SVG Line & Path */}
            <svg className="w-full h-[50px] sm:h-[60px] xl:h-[65px] overflow-visible">
              {/* Subtle Horizontal Grid lines */}
              <line x1="0" y1="8" x2="100%" y2="8" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 2" />
              <line x1="0" y1="28" x2="100%" y2="28" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 2" />
              <line x1="0" y1="48" x2="100%" y2="48" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 2" />

              {/* Smooth Orange Trend Line */}
              <path
                d="M 10 45 C 35 40, 70 24, 120 8"
                fill="none"
                stroke="#EB5A00"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data Node Dots */}
              <circle cx="10" cy="45" r="3.5" fill="#EB5A00" />
              <circle cx="45" cy="35" r="3.5" fill="#EB5A00" />
              <circle cx="82" cy="22" r="3.5" fill="#EB5A00" />
              <circle cx="120" cy="8" r="3.5" fill="#EB5A00" />
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between w-full text-[8px] sm:text-[9px] text-white/50 font-medium px-1 mt-0.5">
              <span>Now</span>
              <span>+1 hr</span>
              <span>+2 hr</span>
              <span>+3 hr</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

