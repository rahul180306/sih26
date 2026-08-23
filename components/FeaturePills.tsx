'use client';

import React from 'react';
import { CloudRain, Target, ShieldCheck } from 'lucide-react';

export const FeaturePills: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Pill 1 */}
      <div className="h-10 px-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center gap-2.5 text-white text-xs sm:text-sm font-medium shadow-sm hover:bg-white/15 transition-all">
        <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <CloudRain className="w-3.5 h-3.5 text-white" />
        </div>
        <span>Real-time Nowcasting</span>
      </div>

      {/* Pill 2 */}
      <div className="h-10 px-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center gap-2.5 text-white text-xs sm:text-sm font-medium shadow-sm hover:bg-white/15 transition-all">
        <div className="w-6 h-6 rounded-full bg-[#EB5A00]/40 flex items-center justify-center shrink-0 border border-[#EB5A00]/50">
          <Target className="w-3.5 h-3.5 text-white" />
        </div>
        <span>Drainage Coupled</span>
      </div>

      {/* Pill 3 */}
      <div className="h-10 px-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center gap-2.5 text-white text-xs sm:text-sm font-medium shadow-sm hover:bg-white/15 transition-all">
        <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-white" />
        </div>
        <span>AI-Powered Insights</span>
      </div>
    </div>
  );
};

