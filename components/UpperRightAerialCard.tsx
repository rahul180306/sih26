'use client';

import React from 'react';
import Image from 'next/image';
import chennaiImg from '@/public/chennai.png';

interface UpperRightAerialCardProps {
  onOpenMap?: () => void;
}

export const UpperRightAerialCard: React.FC<UpperRightAerialCardProps> = ({ onOpenMap }) => {
  return (
    <div 
      onClick={onOpenMap}
      className="w-full h-full bg-black rounded-[28px] sm:rounded-[34px] relative overflow-hidden group hover:scale-[1.01] transition-all duration-300 cursor-pointer shrink-0 shadow-2xl border border-white/10"
    >
      {/* High Quality Aerial River City Photograph (/chennai.png) */}
      <Image 
        src={chennaiImg} 
        alt="Chennai Aerial Nowcast" 
        fill
        sizes="(max-width: 768px) 100vw, 400px"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        priority
        referrerPolicy="no-referrer"
      />

      {/* Subtle Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Floating Translucent Label Badge (Bottom Left) */}
      <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 px-3 sm:px-4 py-2 sm:py-2.5 bg-black/75 backdrop-blur-md rounded-full border border-white/15 shadow-xl flex items-center gap-2.5 sm:gap-3 text-white">
        {/* Orange Live Pulse Dot */}
        <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#EB5A00] animate-pulse shrink-0" />

        <div className="flex flex-col">
          <span className="text-[11px] sm:text-[12px] font-bold text-white leading-none">
            Live Nowcast
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/80 font-normal leading-tight mt-0.5 sm:mt-1">
            Chennai, India
          </span>
        </div>
      </div>
    </div>
  );
};


