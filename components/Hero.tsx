'use client';

import React from 'react';
import Image from 'next/image';
import heroImg from '@/public/hero.png';
import { FeaturePills } from './FeaturePills';
import { UpperRightAerialCard } from './UpperRightAerialCard';
import { LowerOrangeCard } from './LowerOrangeCard';
import { LowerForecastCard } from './LowerForecastCard';
import { BottomRightCard } from './BottomRightCard';
import { ArrowUpRight, Play } from 'lucide-react';

interface HeroProps {
  onOpenMap: () => void;
  onOpenHowItWorks: () => void;
  onOpenContact: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenMap, onOpenHowItWorks }) => {
  return (
    <section className="w-full h-full max-w-[1440px] max-h-[calc(100vh-80px)] min-h-[520px] mx-auto px-4 sm:px-6 relative flex flex-col justify-center items-center">
      
      {/* Background Subtle Dot Pattern at Bottom Left */}
      <div className="absolute left-2 bottom-2 w-28 h-28 opacity-30 pointer-events-none z-0 hidden lg:block">
        <div className="grid grid-cols-6 gap-2.5">
          {[...Array(36)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#EB5A00]" />
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW WITH ACCURATE ORGANIC CUTOUT GEOMETRY (Hidden on < lg)        */}
      {/* ========================================================================= */}
      <div className="hidden lg:block relative w-full h-full max-h-[780px] z-10">
        
        {/* SVG BACKGROUND WITH PRECISE CLIPPING PATH */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1440 840"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
        >
          <defs>
            <clipPath id="hero-cutout-path">
              <path
                d="
                  M 48 0
                  H 950
                  C 1000 0, 1010 20, 1010 60
                  V 220
                  C 1010 270, 1030 290, 1080 290
                  H 1380
                  C 1440 290, 1440 310, 1440 370
                  V 490
                  C 1440 550, 1420 570, 1360 570
                  H 880
                  C 820 570, 810 590, 810 640
                  V 780
                  C 810 840, 790 840, 730 840
                  H 48
                  C 0 840, 0 810, 0 780
                  V 60
                  C 0 0, 20 0, 48 0
                  Z
                "
              />
            </clipPath>
            <linearGradient
              id="hero-gradient-r"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop
                offset="0%"
                stopColor="#080C12"
                stopOpacity="0.72"
              />
              <stop
                offset="38%"
                stopColor="#080C12"
                stopOpacity="0.48"
              />
              <stop
                offset="70%"
                stopColor="#080C12"
                stopOpacity="0.18"
              />
              <stop
                offset="100%"
                stopColor="#080C12"
                stopOpacity="0.02"
              />
            </linearGradient>
            <linearGradient
              id="hero-gradient-t"
              x1="0"
              y1="1"
              x2="0"
              y2="0"
            >
              <stop
                offset="0%"
                stopColor="#080C12"
                stopOpacity="0.72"
              />
              <stop
                offset="30%"
                stopColor="#080C12"
                stopOpacity="0.20"
              />
              <stop
                offset="100%"
                stopColor="#080C12"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <g clipPath="url(#hero-cutout-path)">
            {/* Base */}
            <rect
              x="0"
              y="0"
              width="1440"
              height="840"
              fill="#0C1017"
            />
            {/* HERO IMAGE */}
            <image
              x="0"
              y="0"
              width="1440"
              height="840"
              href={typeof heroImg === 'string' ? heroImg : heroImg.src}
              xlinkHref={typeof heroImg === 'string' ? heroImg : heroImg.src}
              preserveAspectRatio="xMidYMid slice"
              style={{
                display: 'block',
              }}
            />
            {/* Dark cinematic overlay */}
            <rect
              x="0"
              y="0"
              width="1440"
              height="840"
              fill="url(#hero-gradient-r)"
            />
            <rect
              x="0"
              y="0"
              width="1440"
              height="840"
              fill="url(#hero-gradient-t)"
            />
          </g>
        </svg>

        {/* ========================================================================= */}
        {/* INTERACTIVE FOREGROUND CONTENT                                            */}
        {/* ========================================================================= */}
        <div className="absolute inset-0 z-30 p-[3.5%] xl:p-[4%] flex flex-col justify-between pointer-events-none">
          
          {/* TOP CONTENT: Feature Pills */}
          <div className="pointer-events-auto">
            <FeaturePills />
          </div>

          {/* MIDDLE CONTENT: Main Typography & CTAs */}
          <div className="max-w-[620px] my-auto pointer-events-auto pt-2 pb-4 xl:pb-6">
            <h1 className="text-[44px] lg:text-[54px] xl:text-[68px] 2xl:text-[74px] font-black tracking-[-0.03em] leading-[0.96] text-white mb-3 xl:mb-5 drop-shadow-md">
              Predict Today.
              <br />
              <span className="text-[#EB5A00]">
                Protect Tomorrow.
              </span>
            </h1>

            <p className="text-[14px] xl:text-[16px] text-white/90 font-normal leading-[1.5] max-w-[480px] mb-5 xl:mb-8 drop-shadow-sm">
              Real-time urban flood nowcasting that connects rainfall, drainage, and terrain intelligence to help cities stay ahead of floods.
            </p>

            <div className="flex items-center gap-3.5 xl:gap-4">
              <button
                onClick={onOpenMap}
                className="h-[46px] xl:h-[52px] px-6 xl:px-8 rounded-full bg-[#EB5A00] text-white font-bold text-[14px] xl:text-[16px] flex items-center gap-2.5 shadow-lg shadow-orange-950/30 hover:bg-[#FF6600] transition-all cursor-pointer hover:scale-[1.02]"
              >
                <span>Explore Live Map</span>
                <ArrowUpRight className="w-4 h-4 xl:w-5 xl:h-5 stroke-[2.5]" />
              </button>
              <button
                onClick={onOpenHowItWorks}
                className="h-[46px] xl:h-[52px] px-5 xl:px-7 rounded-full bg-black/40 backdrop-blur-md border border-white/30 text-white font-medium text-[14px] xl:text-[16px] flex items-center gap-2.5 xl:gap-3 hover:bg-white/10 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <span>How It Works</span>
                <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-full border border-white/60 flex items-center justify-center shrink-0">
                  <Play className="w-2 xl:w-2.5 h-2 xl:h-2.5 fill-white text-white ml-0.5" />
                </div>
              </button>
            </div>
          </div>

          {/* BOTTOM CONTENT: Nested Lower Cards Row */}
          <div className="pointer-events-auto flex items-center gap-4 xl:gap-5 pt-1 w-[55%]">
            <LowerOrangeCard />
            <LowerForecastCard />
          </div>

        </div>

        {/* ========================================================================= */}
        {/* CUTOUT SLOTS (TOP-RIGHT & BOTTOM-RIGHT CARDS)                             */}
        {/* ========================================================================= */}
        
        {/* Top-Right Aerial Card Slot (Positioned perfectly inside the top-right cutout gap) */}
        <div className="absolute z-40 pointer-events-auto" style={{ top: '0', right: '0', width: '27.77%', height: '30.95%' }}>
          <UpperRightAerialCard onOpenMap={onOpenMap} />
        </div>

        {/* Bottom-Right Decision Card Slot (Positioned perfectly inside the bottom-right cutout gap) */}
        <div className="absolute z-40 pointer-events-auto" style={{ bottom: '0', right: '0', width: '41.66%', height: '28.57%' }}>
          <BottomRightCard onLearnMore={onOpenHowItWorks} />
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MOBILE / TABLET RESPONSIVE FALLBACK LAYOUT (Clean Stack for < lg)          */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex flex-col gap-6 z-10 relative w-full flex-1 py-4">

        {/* Main Hero Card for Mobile / Tablet */}
        <div className="w-full bg-[#0C1017] rounded-[32px] p-6 sm:p-8 relative overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between min-h-[500px]">
          
          {/* Hero Image Background */}
          <Image 
            src={heroImg} 
            alt="Hero Background" 
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1000px"
            className="object-cover object-center pointer-events-none" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080C12]/85 via-[#080C12]/55 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080C12]/80 via-transparent to-transparent pointer-events-none" />

          {/* Feature Pills */}
          <div className="relative z-10 mb-6">
            <FeaturePills />
          </div>

          {/* Headline & CTAs */}
          <div className="relative z-10 my-3">
            <h1 className="text-[38px] sm:text-[48px] font-black tracking-[-0.03em] leading-[0.98] text-white mb-4 drop-shadow-md">
              Predict Today.
              <br />
              <span className="text-[#EB5A00]">
                Protect Tomorrow.
              </span>
            </h1>

            <p className="text-[14px] sm:text-[15px] text-white/90 font-normal leading-[1.5] max-w-[480px] mb-5 drop-shadow-sm">
              Real-time urban flood nowcasting that connects rainfall, drainage, and terrain intelligence to help cities stay ahead of floods.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-5">
              <button
                onClick={onOpenMap}
                className="h-[46px] px-6 rounded-full bg-[#EB5A00] text-white font-bold text-[14px] flex items-center gap-2 shadow-lg shadow-orange-950/30 hover:bg-[#FF6600] transition-all cursor-pointer"
              >
                <span>Explore Live Map</span>
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                onClick={onOpenHowItWorks}
                className="h-[46px] px-6 rounded-full bg-black/40 backdrop-blur-md border border-white/30 text-white font-medium text-[14px] flex items-center gap-2.5 hover:bg-white/10 transition-all cursor-pointer"
              >
                <span>How It Works</span>
                <div className="w-5 h-5 rounded-full border border-white/60 flex items-center justify-center shrink-0">
                  <Play className="w-2 h-2 fill-white text-white ml-0.5" />
                </div>
              </button>
            </div>
          </div>

          {/* Lower Floating Cards on Mobile */}
          <div className="relative z-10 flex flex-col sm:flex-row gap-4 pt-2">
            <LowerOrangeCard />
            <LowerForecastCard />
          </div>

        </div>

        {/* Stacked Cards for Mobile */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-[220px]">
            <UpperRightAerialCard onOpenMap={onOpenMap} />
          </div>
          <div className="flex-1 h-[180px]">
            <BottomRightCard onLearnMore={onOpenHowItWorks} />
          </div>
        </div>

      </div>

    </section>
  );
};


