'use client';

import React from 'react';
import Image from 'next/image';
import hori1 from '@/public/hori1.png';
import hori2 from '@/public/hori2.png';
import hori3 from '@/public/hori3.png';
import hori4 from '@/public/hori4.png';

const IMAGES = [
  { id: '1', src: hori1, alt: 'Flood inundation mapping and digital twin overview' },
  { id: '2', src: hori2, alt: 'Urban drainage network monitoring and surcharge detection' },
  { id: '3', src: hori3, alt: 'Terrain elevation and hydrodynamic surface runoff modeling' },
  { id: '4', src: hori4, alt: 'Real-time weather radar nowcasting and precipitation telemetry' },
];

export const HorizontalMarquee: React.FC = () => {
  // Repeating the set 3 times for a completely seamless, continuous loop
  const loopImages = [...IMAGES, ...IMAGES, ...IMAGES, ...IMAGES];

  return (
    <section className="w-full py-10 sm:py-14 bg-white overflow-hidden relative">
      {/* Left and Right Subtle Fade Gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      {/* Infinite Horizontal Smooth Marquee */}
      <div className="w-full overflow-hidden flex">
        <div className="animate-marquee flex items-center gap-5 sm:gap-6 shrink-0 py-2">
          {loopImages.map((img, index) => (
            <div
              key={`${img.id}-${index}`}
              className="relative w-[280px] sm:w-[340px] md:w-[380px] h-[130px] sm:h-[155px] md:h-[175px] shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm transition-transform duration-300 hover:scale-[1.03] cursor-pointer"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 768px) 340px, 380px"
                className="object-cover w-full h-full"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
