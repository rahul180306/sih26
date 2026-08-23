'use client';

import React, { useState } from 'react';
import { User } from 'lucide-react';
import { TextPressure } from '@/components/TextPressure';

interface NavigationProps {
  onOpenContact: () => void;
  onOpenMap: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ onOpenContact, onOpenMap }) => {
  const [activeTab, setActiveTab] = useState('Home');

  const navLinks = ['Home', 'About Us', 'Technology', 'Impact'];

  return (
    <header className="w-full max-w-[1440px] mx-auto pt-3 sm:pt-4 pb-2 px-4 sm:px-6 relative z-30 shrink-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        
        {/* LEFT BRAND PILL */}
        <div 
          className="h-[52px] sm:h-[58px] bg-[#EB5A00] rounded-full px-4 sm:px-5 flex items-center gap-2.5 sm:gap-3 shadow-lg hover:scale-[1.01] transition-all duration-300 ease-out cursor-pointer shrink-0 w-auto max-w-fit"
          onClick={() => setActiveTab('Home')}
        >
          {/* Custom White Rotated Diamond/Leaf Water Icon on Left */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 36 36" className="w-7 h-7 sm:w-8 sm:h-8 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 2 L34 18 L18 34 L2 18 Z" />
              {/* Inner leaf/water negative shapes */}
              <path d="M18 8 C14 14, 10 18, 18 28 C26 18, 22 14, 18 8 Z" fill="#EB5A00" />
            </svg>
          </div>

          {/* Middle: TextPressure for JALRAKSHAK (Fluid Auto Width) */}
          <div className="h-[26px] sm:h-[30px] flex items-center shrink-0">
            <TextPressure
              text="JALRAKSHAK"
              flex={false}
              alpha={false}
              stroke={false}
              width={true}
              weight={true}
              italic={true}
              scale={false}
              autoWidth={true}
              textColor="#FFFFFF"
              minFontSize={17}
            />
          </div>

          {/* Right: URBAN */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-white/30 shrink-0">
            <span className="text-[10px] sm:text-[11px] font-black tracking-[0.25em] text-white/95 uppercase leading-none">
              URBAN
            </span>
          </div>
        </div>

        {/* MAIN NAV PILL */}
        <nav className="h-[52px] sm:h-[58px] bg-[#0A0E14] rounded-full px-5 sm:px-8 flex items-center justify-between gap-4 sm:gap-8 shadow-2xl border border-white/10 w-full sm:w-auto flex-1 max-w-[860px]">
          
          {/* Nav Links */}
          <div className="flex items-center gap-5 sm:gap-8 overflow-x-auto no-scrollbar">
            {navLinks.map((link) => {
              const isActive = activeTab === link;
              return (
                <button
                  key={link}
                  onClick={() => setActiveTab(link)}
                  className={`text-[14px] sm:text-[15px] font-semibold transition-colors duration-200 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'text-[#EB5A00] font-bold'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {link}
                </button>
              );
            })}
          </div>

          {/* Right Action - Contact Us */}
          <div className="flex items-center shrink-0">
            <button
              onClick={onOpenContact}
              className="px-4 sm:px-5 py-2 rounded-full border border-white/30 text-white hover:bg-white/10 text-[13px] sm:text-[14px] font-medium flex items-center gap-2 transition-all duration-200 group cursor-pointer"
            >
              <User className="w-4 h-4 text-white stroke-[1.8]" />
              <span className="whitespace-nowrap">Contact Us</span>
            </button>
          </div>

        </nav>

      </div>
    </header>
  );
};

