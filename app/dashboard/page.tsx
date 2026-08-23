'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const LiveMapDashboard = dynamic(
  () => import('@/components/LiveMapDashboard'),
  { ssr: false }
);

export default function DashboardPage() {
  return (
    <main className="min-h-screen w-screen bg-[#090D14] overflow-hidden">
      <LiveMapDashboard isOpen={true} onClose={() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }} />
    </main>
  );
}
