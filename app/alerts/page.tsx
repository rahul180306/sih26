'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { HowItWorksModal } from '@/components/HowItWorksModal';
import { ContactModal } from '@/components/ContactModal';

const AlertsView = dynamic(() => import('@/components/AlertsView'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#070A0F] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#F56A00] border-t-transparent rounded-full animate-spin" />
        <span className="text-white/60 text-sm font-semibold">Loading Urban Flood Early Warning Hub...</span>
      </div>
    </div>
  ),
});

export default function AlertsPage() {
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

  return (
    <main className="min-h-screen w-screen bg-[#070A0F] text-white selection:bg-[#F56A00] selection:text-white flex flex-col justify-between">
      
      {/* Top Header Navigation */}
      <div className="w-full bg-[#0A0E14]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
        <Navigation
          onOpenContact={openContact}
          onOpenMap={() => openMap()}
        />
      </div>

      {/* Main Alerts Command Center Content */}
      <div className="flex-1 w-full">
        <AlertsView />
      </div>

      {/* Footer */}
      <Footer
        onOpenHowItWorks={openHowItWorks}
        onOpenMap={() => openMap()}
        onOpenContact={openContact}
      />

      {/* Modals */}
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
