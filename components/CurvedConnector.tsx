'use client';

import React from 'react';

export const CurvedConnector: React.FC = () => {
  return (
    <div className="hidden lg:block absolute top-[210px] right-[260px] xl:right-[280px] w-[120px] h-[120px] xl:w-[140px] xl:h-[140px] z-20 pointer-events-none">
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full fill-white"
      >
        <path d="M 100 0 L 100 60 C 100 100 60 100 0 100 L 0 100 L 100 100 Z" />
      </svg>
    </div>
  );
};
