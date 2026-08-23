'use client';

import React, { useState, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { Hero } from '@/components/Hero';
import { HorizontalMarquee } from '@/components/HorizontalMarquee';
import { Footer } from '@/components/Footer';
import { HowItWorksModal } from '@/components/HowItWorksModal';
import { ContactModal } from '@/components/ContactModal';
import { ChevronDown } from 'lucide-react';

export default function Home() {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const openMap = useCallback((tab?: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard' + (tab ? '?tab=' + tab : '');
    }
  }, []);

  const openHowItWorks = () => setIsHowItWorksOpen(true);
  const closeHowItWorks = () => setIsHowItWorksOpen(false);
  const openContact = () => setIsContactOpen(true);
  const closeContact = () => setIsContactOpen(false);

  const scrollToMarquee = () => {
    const marqueeEl = document.getElementById('marquee-section');
    if (marqueeEl) {
      marqueeEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen w-screen overflow-x-hidden bg-white text-[#090E15] selection:bg-[#F56A00] selection:text-white">
      
      {/* ========================================================================= */}
      {/* SCREEN 1: ONE-SCREEN FIT HERO SECTION (Full 100vh)                         */}
      {/* ========================================================================= */}
      <div className="h-screen w-full flex flex-col justify-between relative">
        {/* Top Header Navigation */}
        <Navigation
          onOpenContact={openContact}
          onOpenMap={() => openMap()}
        />

        {/* Main Hero Bento Section */}
        <div className="flex-1 min-h-0 w-full flex flex-col justify-center items-center pb-2">
          <Hero
            onOpenMap={() => openMap()}
            onOpenHowItWorks={openHowItWorks}
            onOpenContact={openContact}
          />
        </div>

        {/* Subtle Scroll Down Prompt */}
        <div className="w-full flex justify-center pb-2 pointer-events-auto">
          <button
            onClick={scrollToMarquee}
            className="flex items-center gap-1.5 text-black/40 hover:text-[#EB5A00] text-[11px] font-semibold transition-colors duration-200 cursor-pointer animate-bounce"
            aria-label="Scroll to explore features"
          >
            <span>Scroll to explore</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN 2: HORIZONTAL SMOOTH MARQUEE SECTION (Revealed on Scroll)           */}
      {/* ========================================================================= */}
      <div id="marquee-section" className="w-full border-t border-black/5 bg-gray-50/50">
        <HorizontalMarquee />
      </div>

      {/* Reference Designed Footer */}
      <Footer
        onOpenHowItWorks={openHowItWorks}
        onOpenMap={() => openMap()}
        onOpenContact={openContact}
      />

      {/* Modals & Interactive Overlays */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={closeHowItWorks}
        onOpenMap={() => {
          closeHowItWorks();
          openMap();
        }}
      />

      <ContactModal
        isOpen={isContactOpen}
        onClose={closeContact}
      />

    </main>
  );
}


