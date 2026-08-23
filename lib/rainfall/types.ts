/**
 * JalRakshak Normalized Rainfall Data Contract & Provider Framework
 * SIH26085 Data Access Architecture
 */

export type RainfallProviderType = 'IMD' | 'MOSDAC' | 'GPM' | 'TOMORROW_IO' | 'REPLAY';
export type RainfallQualityState = 'LIVE' | 'FALLBACK' | 'DEGRADED' | 'REPLAY';

export interface RainfallCell {
  cellId: string;
  lat: number;
  lng: number;
  intensity_mm_hr: number;
  probability_pct: number;
  catchmentId?: string;
  gridResolutionKm?: number;
}

export interface RainfallSnapshot {
  provider: RainfallProviderType;
  providerDisplayName: string;
  providerType: 'Official Doppler Radar' | 'Satellite Earth Observation' | 'External Weather API' | 'Deterministic Replay Engine';
  observedAt: string;
  ingestedAt: string;
  resolutionMinutes: number;
  spatialResolution: string;
  unit: 'mm/hr';
  grid: RainfallCell[];
  averageIntensity_mm_hr: number;
  peakIntensity_mm_hr: number;
  accumulated6hr_mm: number;
  quality: RainfallQualityState;
  degradationReason?: string;
  sourceUrl?: string;
  sourceIdentifier: string;
  snapshotHash: string;
  authStatus: 'AUTHENTICATED' | 'AWAITING_APPROVAL' | 'UNAUTHENTICATED' | 'N/A';
  isFallback: boolean;
}

export interface ProviderStatusInfo {
  id: RainfallProviderType;
  name: string;
  type: string;
  status: 'ONLINE' | 'AWAITING_ACCESS' | 'FALLBACK_READY' | 'DETERMINISTIC_READY' | 'DEGRADED';
  badge: 'LIVE' | 'AWAITING_ACCESS' | 'FALLBACK' | 'REPLAY';
  details: string;
  isActive: boolean;
  priorityRank: number;
  lastUpdated?: string;
  credentialRequired: string;
  credentialConfigured: boolean;
}
