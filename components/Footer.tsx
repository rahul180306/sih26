'use client';

import React from 'react';
import { Linkedin, Instagram, Twitter, Facebook, Github } from 'lucide-react';
import { TextPressure } from '@/components/TextPressure';

interface FooterProps {
  onOpenHowItWorks?: () => void;
  onOpenMap?: () => void;
  onOpenContact?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenHowItWorks,
  onOpenMap,
  onOpenContact,
}) => {
  const footerSections = [
    {
      title: 'Products',
      links: [
        { label: 'Nowcast Grid', onClick: onOpenMap },
        { label: 'Radar Fusion', onClick: onOpenHowItWorks },
        { label: 'Drainage IQ', onClick: onOpenHowItWorks },
        { label: 'Municipal Portal', onClick: onOpenContact },
        { label: 'API & Webhooks', onClick: onOpenContact },
      ],
    },
    {
      title: 'Use Cases',
      links: [
        { label: 'For Municipalities', onClick: onOpenContact },
        { label: 'For First Responders', onClick: onOpenContact },
        { label: 'For Urban Planners', onClick: onOpenHowItWorks },
        { label: 'For Smart Cities', onClick: onOpenMap },
        { label: 'For Transport Teams', onClick: onOpenContact },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', onClick: onOpenHowItWorks },
        { label: 'Integrations', onClick: onOpenHowItWorks },
        { label: 'Physics & Research', onClick: onOpenHowItWorks },
        { label: 'Changelog', onClick: onOpenHowItWorks },
        { label: 'Simulation Videos', onClick: onOpenMap },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', onClick: onOpenHowItWorks },
        { label: 'Careers', onClick: onOpenContact },
        { label: 'Contact', onClick: onOpenContact },
        { label: 'Press & Media', onClick: onOpenContact },
        { label: 'Impact & ESG', onClick: onOpenHowItWorks },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', onClick: onOpenContact },
        { label: 'Privacy Policy', onClick: onOpenContact },
        { label: 'Cookie Policy', onClick: onOpenContact },
        { label: 'Security Overview', onClick: onOpenContact },
      ],
    },
  ];

  return (
    <footer className="w-full bg-[#050711] text-white pt-16 sm:pt-20 pb-4 overflow-hidden relative border-t border-white/5">
      {/* Background subtle radial ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-950/20 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12 relative z-10">
        
        {/* Top 5-Column Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 lg:gap-12 pb-14 sm:pb-16">
          {footerSections.map((section) => (
            <div key={section.title} className="flex flex-col">
              <h4 className="text-[15px] sm:text-[16px] font-semibold text-white tracking-tight mb-4 sm:mb-5">
                {section.title}
              </h4>
              <ul className="flex flex-col space-y-2.5 sm:space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={link.onClick}
                      className="text-[13px] sm:text-[14px] text-white/60 hover:text-white transition-colors duration-150 text-left cursor-pointer"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Thin Divider Line */}
        <div className="w-full h-px bg-white/10 my-2" />

        {/* Sub-Bar: Legal Links, Copyright, Social Icons */}
        <div className="py-6 sm:py-7 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-[13px] text-white/50">
          
          {/* Left: Quick Legal Links */}
          <div className="flex items-center gap-6">
            <button 
              onClick={onOpenContact}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button 
              onClick={onOpenContact}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms of Services
            </button>
            <button 
              onClick={onOpenContact}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Cookies
            </button>
          </div>

          {/* Middle: Copyright Statement */}
          <div className="text-center text-white/50 text-[12px] sm:text-[13px]">
            Copyright © 2026 JalRakshak. All rights reserved.
          </div>

          {/* Right: Social Media Icons */}
          <div className="flex items-center gap-4 text-white/70">
            <a 
              href="#" 
              aria-label="LinkedIn"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:text-white hover:bg-white/10 transition-all"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a 
              href="#" 
              aria-label="Instagram"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:text-white hover:bg-white/10 transition-all"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a 
              href="#" 
              aria-label="X (Twitter)"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:text-white hover:bg-white/10 transition-all"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a 
              href="#" 
              aria-label="Facebook"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:text-white hover:bg-white/10 transition-all"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a 
              href="#" 
              aria-label="Github / Discord"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:text-white hover:bg-white/10 transition-all"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>

        </div>

      </div>

      {/* Interactive Variable Font Brand Watermark (TextPressure) */}
      <div className="w-full select-none overflow-hidden flex justify-center items-end mt-6 sm:mt-8 -mb-4 sm:-mb-8 px-4 relative z-10 min-h-[140px] sm:min-h-[200px] lg:min-h-[260px]">
        <div className="w-full max-w-[1300px] h-[140px] sm:h-[200px] lg:h-[260px] opacity-35 hover:opacity-85 transition-opacity duration-500">
          <TextPressure
            text="JALRAKSHAK"
            flex={true}
            alpha={false}
            stroke={false}
            width={true}
            weight={true}
            italic={true}
            scale={true}
            textColor="#F56A00"
            minFontSize={48}
          />
        </div>
      </div>
    </footer>
  );
};
