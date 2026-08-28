'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Flame,
  Droplets,
  Radio,
  Share2,
  Download,
  Copy,
  Check,
  Send,
  Plus,
  RefreshCw,
  Search,
  Filter,
  MapPin,
  Volume2,
  VolumeX,
  Users,
  Activity,
  Clock,
  X,
  CheckCircle2,
  SlidersHorizontal,
  Compass,
  MessageSquare,
  Navigation as NavIcon,
  HelpCircle,
  Truck,
  ChevronDown,
  AlertCircle,
  TrendingUp,
  Wifi,
  WifiOff,
  History,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import {
  FloodAlert,
  AlertSeverity,
  AlertStatus,
  EmergencyDispatchUnit,
  generateCapXml,
  CITY_LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_BCP47,
  SupportedLang,
} from '@/lib/alertsData';

interface AlertsViewProps {
  initialCityId?: string;
  onNavigateToMap?: (cityId: string, catchmentId?: string) => void;
}

const CITY_NAME_MAP: Record<string, string> = {
  all: 'All Metros',
  mumbai: 'Mumbai Metro',
  chennai: 'Chennai',
  delhi: 'Delhi NCR',
  bengaluru: 'Bengaluru',
  kolkata: 'Kolkata',
};

export const AlertsView: React.FC<AlertsViewProps> = ({
  initialCityId = 'all',
  onNavigateToMap,
}) => {
  // All alerts (unfiltered by severity/status — used for KPIs)
  const [allCityAlerts, setAllCityAlerts] = useState<FloodAlert[]>([]);
  // Severity/status filtered alerts — used only for the cards grid
  const [alerts, setAlerts] = useState<FloodAlert[]>([]);
  const [dispatchUnits, setDispatchUnits] = useState<EmergencyDispatchUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [nextSyncIn, setNextSyncIn] = useState(20);
  const [selectedCity, setSelectedCity] = useState<string>(initialCityId);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Alert count per city for pills
  const [cityAlertCounts, setCityAlertCounts] = useState<Record<string, number>>({});

  // Expanded audit log card
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Selected Alert for Modals
  const [selectedAlertForCap, setSelectedAlertForCap] = useState<FloodAlert | null>(null);
  const [selectedAlertForBroadcast, setSelectedAlertForBroadcast] = useState<FloodAlert | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLang>('en');
  const [copiedCap, setCopiedCap] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // New Alert Creation Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1); // multi-step workflow
  const [newHotspot, setNewHotspot] = useState('');
  const [newCity, setNewCity] = useState('mumbai');
  const [newSeverity, setNewSeverity] = useState<AlertSeverity>('CRITICAL');
  const [newHeadline, setNewHeadline] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDepth, setNewDepth] = useState('0.75');
  const [newSurcharge, setNewSurcharge] = useState('92');
  const [newRainfall, setNewRainfall] = useState('75');
  const [newLeadTime, setNewLeadTime] = useState('0.5');
  const [newRoads, setNewRoads] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio Siren Synth using Web Audio API
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // =====================================================================
  // DATA FETCHING
  // =====================================================================

  // Fetch all city alerts (for KPI metrics — NOT filtered by severity/status)
  const fetchCityAlerts = useCallback(async (cityId: string) => {
    try {
      const params = new URLSearchParams();
      if (cityId && cityId !== 'all') params.set('city', cityId);
      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.status === 'success') {
        setAllCityAlerts(data.alerts || []);
        setDispatchUnits(data.dispatchUnits || []);
        // Count alerts per city from the national dataset
        const counts: Record<string, number> = {};
        const allRes = await fetch('/api/alerts');
        if (allRes.ok) {
          const allData = await allRes.json();
          if (allData.status === 'success') {
            (allData.alerts as FloodAlert[]).forEach((a) => {
              if (a.status !== 'RESOLVED') {
                counts[a.cityId] = (counts[a.cityId] || 0) + 1;
              }
            });
          }
        }
        setCityAlertCounts(counts);
      }
    } catch {
      // silent
    }
  }, []);

  // Fetch filtered alerts (for the cards grid)
  const fetchAlerts = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setFetchError(false);
      const params = new URLSearchParams();
      if (selectedCity && selectedCity !== 'all') params.set('city', selectedCity);
      if (selectedSeverity && selectedSeverity !== 'ALL') params.set('severity', selectedSeverity);
      if (selectedStatus && selectedStatus !== 'ALL') params.set('status', selectedStatus);

      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.status === 'success') {
        setAlerts(data.alerts || []);
      }
      setLastSynced(new Date());
      setNextSyncIn(20);
    } catch {
      setFetchError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCity, selectedSeverity, selectedStatus]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchAlerts();
    fetchCityAlerts(selectedCity);
    const interval = setInterval(() => {
      fetchAlerts();
      fetchCityAlerts(selectedCity);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchAlerts, fetchCityAlerts, selectedCity]);

  // Countdown timer for next sync
  useEffect(() => {
    const t = setInterval(() => {
      setNextSyncIn((prev) => (prev <= 1 ? 20 : prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [lastSynced]);

  // When city changes, reset filters and reload
  const handleCityChange = (cityId: string) => {
    setSelectedCity(cityId);
    setSelectedSeverity('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  // =====================================================================
  // SIREN AUDIO
  // =====================================================================
  const toggleSiren = () => {
    if (isSirenPlaying) {
      try {
        oscillatorRef.current?.stop();
        oscillatorRef.current?.disconnect();
        oscillatorRef.current = null;
      } catch { /* handled */ }
      setIsSirenPlaying(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.75, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(140, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        lfo.start();
        oscillatorRef.current = osc;
        setIsSirenPlaying(true);
        setTimeout(() => {
          try { osc.stop(); osc.disconnect(); lfo.stop(); } catch { /* ok */ }
          setIsSirenPlaying(false);
        }, 5000);
      } catch (e) {
        console.error('Siren error:', e);
      }
    }
  };

  // =====================================================================
  // FILTERED ALERTS (search only — severity/status already handled by API)
  // =====================================================================
  const filteredAlerts = useMemo(() => {
    if (!searchQuery.trim()) return alerts;
    const q = searchQuery.toLowerCase();
    return alerts.filter((alert) => {
      return (
        alert.hotspotName.toLowerCase().includes(q) ||
        alert.cityName.toLowerCase().includes(q) ||
        alert.headline.toLowerCase().includes(q) ||
        alert.affectedRoads.some((r) => r.toLowerCase().includes(q))
      );
    });
  }, [alerts, searchQuery]);

  // =====================================================================
  // KPI METRICS — computed from allCityAlerts (city dataset, not filtered)
  // =====================================================================
  const metrics = useMemo(() => {
    const src = allCityAlerts;
    const criticalCount = src.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
    const warningCount = src.filter((a) => a.severity === 'WARNING' && a.status !== 'RESOLVED').length;
    const maxDepth = src.length > 0 ? Math.max(...src.map((a) => a.predictedDepthCm)) : 0;
    const totalPumps = src.reduce((acc, a) => acc + (a.dewateringPumpsActive || 0), 0);
    const totalPop = src
      .filter((a) => a.status !== 'RESOLVED')
      .reduce((acc, a) => acc + (a.vulnerablePopulationEst || 0), 0);
    return { criticalCount, warningCount, maxDepth, totalPumps, totalPop };
  }, [allCityAlerts]);

  // =====================================================================
  // OPERATIONAL ACTIONS
  // =====================================================================
  const handleUpdateStatus = async (id: string, newStatus: AlertStatus) => {
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, actor: 'EOC Operator' }),
      });
      fetchAlerts();
      fetchCityAlerts(selectedCity);
    } catch (e) { console.error(e); }
  };

  const handleDeployPump = async (id: string, currentPumps: number) => {
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, dewateringPumpsActive: currentPumps + 1, actor: 'Field Operator' }),
      });
      fetchAlerts();
    } catch (e) { console.error(e); }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createStep === 1) { setCreateStep(2); return; }
    if (createStep === 2) { setCreateStep(3); return; }
    // Step 3 — final dispatch
    if (!newHotspot || !newHeadline) return;
    setIsSubmitting(true);
    try {
      const cityNameMap: Record<string, string> = {
        mumbai: 'Mumbai Metro', chennai: 'Chennai Metro',
        delhi: 'Delhi NCR', bengaluru: 'Bengaluru Metro', kolkata: 'Kolkata Metro',
      };
      const payload = {
        cityId: newCity,
        cityName: cityNameMap[newCity] || 'National Metro',
        hotspotName: newHotspot,
        severity: newSeverity,
        headline: newHeadline,
        description: newDescription || `Doppler nowcast detected surcharge runoff at ${newHotspot}.`,
        predictedDepthM: parseFloat(newDepth),
        drainageSurchargePct: parseFloat(newSurcharge),
        leadTimeHours: parseFloat(newLeadTime),
        rainfallIntensityMmHr: parseFloat(newRainfall),
        affectedRoads: newRoads ? newRoads.split(',').map((r) => r.trim()) : [],
        vulnerablePopulationEst: 35000,
        dewateringPumpsActive: 4,
        dewateringPumpsRequired: 5,
        ndrfDispatched: newSeverity === 'CRITICAL',
      };
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        setCreateStep(1);
        setNewHotspot(''); setNewHeadline(''); setNewDescription(''); setNewRoads('');
        fetchAlerts();
        fetchCityAlerts(selectedCity);
      }
    } catch (err) { console.error(err); }
    finally { setIsSubmitting(false); }
  };

  const copyCapToClipboard = (alert: FloodAlert) => {
    const xml = generateCapXml(alert);
    navigator.clipboard.writeText(xml);
    setCopiedCap(true);
    setTimeout(() => setCopiedCap(false), 2000);
  };

  const downloadCapXml = (alert: FloodAlert) => {
    const xml = generateCapXml(alert);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CAP-Alert-${alert.id}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleViewOnMap = (alert: FloodAlert) => {
    if (onNavigateToMap) {
      onNavigateToMap(alert.cityId, alert.catchmentId);
    } else if (typeof window !== 'undefined') {
      window.location.href = `/dashboard?city=${encodeURIComponent(alert.cityId)}&catchment=${encodeURIComponent(alert.catchmentId || '')}&tab=Flood+Map`;
    }
  };

  // Web Speech API — Listen Alert
  const handleListenAlert = (alert: FloodAlert, lang: SupportedLang) => {
    if (!('speechSynthesis' in window)) return;
    if (isListening) {
      window.speechSynthesis.cancel();
      setIsListening(false);
      return;
    }
    const translation = alert.translations[lang];
    const text = translation
      ? `${translation.headline}. ${translation.instruction}`
      : `${alert.headline}. ${alert.instruction}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANGUAGE_BCP47[lang] || 'en-IN';
    // Try to find a matching voice; fallback to default
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(LANGUAGE_BCP47[lang].split('-')[0]));
    if (match) utter.voice = match;
    utter.rate = 0.9;
    utter.onend = () => setIsListening(false);
    utter.onerror = () => setIsListening(false);
    window.speechSynthesis.speak(utter);
    setIsListening(true);
  };

  // City pills config
  const citySegments = [
    { id: 'all', label: 'All Metros' },
    { id: 'mumbai', label: 'Mumbai Metro' },
    { id: 'chennai', label: 'Chennai' },
    { id: 'delhi', label: 'Delhi NCR' },
    { id: 'bengaluru', label: 'Bengaluru' },
    { id: 'kolkata', label: 'Kolkata' },
  ];

  // Context-aware languages for broadcast modal
  const broadcastLanguages = useMemo((): SupportedLang[] => {
    const cityId = selectedAlertForBroadcast?.cityId || 'all';
    return CITY_LANGUAGES[cityId] || CITY_LANGUAGES['all'];
  }, [selectedAlertForBroadcast]);

  // Reset language to valid one when alert changes
  useEffect(() => {
    if (selectedAlertForBroadcast) {
      const langs = CITY_LANGUAGES[selectedAlertForBroadcast.cityId] || ['en', 'hi'];
      if (!langs.includes(selectedLanguage)) {
        setSelectedLanguage(langs[0]);
      }
    }
  }, [selectedAlertForBroadcast, selectedLanguage]);

  // Filtered dispatch units based on selected city
  const filteredDispatchUnits = useMemo(() => {
    if (!selectedCity || selectedCity === 'all') return dispatchUnits;
    return dispatchUnits.filter((u) => u.cityId === selectedCity);
  }, [dispatchUnits, selectedCity]);

  // Format time
  const formatTime = (date: Date) => date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formatAuditTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="w-full min-h-screen bg-[#070A0F] text-white pb-16 font-sans">

      {/* ================================================================ */}
      {/* 1. EOC COMMAND CENTER HEADER & KPI STATS                          */}
      {/* ================================================================ */}
      <div className="border-b border-white/10 bg-[#0C121E] relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-7 relative z-10">

          {/* Top Operational Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            {/* Left: Title & Badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  CAP v1.2 LIVE DISPATCH
                </span>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/5 text-white/80 border border-white/10">
                  MoES / NCMRWF Rapid Nowcasting
                </span>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#F56A00]/10 text-[#F56A00] border border-[#F56A00]/30">
                  0–3 Hour Forward Horizon
                </span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Urban Flood Warning &amp; Siren Command Center
                </h1>
                <p className="text-white/60 text-xs sm:text-[13px] mt-1 max-w-3xl leading-relaxed">
                  Real-time street inundation predictive dispatch coupling Doppler Weather Radar nowcasts with 2D DEM drainage surcharge graphs. Automated OASIS CAP v1.2 warnings for Municipal Authorities, NDRF, and citizen broadcast networks.
                </p>
              </div>
            </div>

            {/* Right: Action Controls */}
            <div className="flex items-center gap-3 shrink-0 self-start lg:self-center flex-wrap">
              {/* Data freshness indicator */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#121824] border border-white/10 text-[11px]">
                {fetchError ? (
                  <><WifiOff className="w-3.5 h-3.5 text-red-400" /><span className="text-red-400 font-semibold">Data connection degraded</span></>
                ) : lastSynced ? (
                  <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-white/60">Synced {formatTime(lastSynced)} · next <span className="font-mono text-white/80">{nextSyncIn}s</span></span></>
                ) : (
                  <><Wifi className="w-3.5 h-3.5 text-white/40" /><span className="text-white/40">Connecting...</span></>
                )}
              </div>

              {/* Emergency Siren Test */}
              <button
                onClick={toggleSiren}
                id="siren-toggle-btn"
                className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border ${
                  isSirenPlaying
                    ? 'bg-red-600 text-white border-red-500 animate-pulse'
                    : 'bg-[#121824] hover:bg-[#1A2234] text-white/90 hover:text-white border-white/15'
                }`}
                title="Test synthesized emergency warning chime"
              >
                {isSirenPlaying ? (
                  <><Volume2 className="w-4 h-4 text-white" /><span>Siren Active (Mute)</span></>
                ) : (
                  <><VolumeX className="w-4 h-4 text-red-400" /><span>Test Siren Chime</span></>
                )}
              </button>

              {/* Issue Flash Warning */}
              <button
                onClick={() => { setIsCreateModalOpen(true); setCreateStep(1); }}
                id="issue-flash-warning-btn"
                className="px-4 py-2.5 rounded-xl bg-[#F56A00] hover:bg-[#FF7518] text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#F56A00]/25 hover:shadow-[#F56A00]/40"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Issue Flash Warning</span>
              </button>

              {/* Refresh */}
              <button
                onClick={fetchAlerts}
                disabled={isRefreshing}
                id="refresh-alerts-btn"
                className="p-2.5 rounded-xl bg-[#121824] hover:bg-[#1A2234] border border-white/15 text-white/70 hover:text-white transition-all cursor-pointer"
                title="Refresh live alerts"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F56A00]' : ''}`} />
              </button>
            </div>
          </div>

          {/* KPI STATS — computed from full city dataset, unaffected by severity filter */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-5">
            <div className="bg-[#111726] border border-red-500/30 rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Critical Inundation</span>
                <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-white">{metrics.criticalCount}</span>
                <span className="text-[11px] text-red-400 font-semibold">Hotspots</span>
              </div>
              <div className="text-[10px] text-white/40 font-medium">Depth &gt; 0.70m Sump Inundation</div>
            </div>

            <div className="bg-[#111726] border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Drainage Surcharges</span>
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-white">{metrics.warningCount}</span>
                <span className="text-[11px] text-amber-400 font-semibold">Overloaded</span>
              </div>
              <div className="text-[10px] text-white/40 font-medium">&gt; 85% Culvert Capacity</div>
            </div>

            <div className="bg-[#111726] border border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Peak Water Level</span>
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-white">{metrics.maxDepth}</span>
                <span className="text-[11px] text-cyan-400 font-bold">cm ({(metrics.maxDepth / 100).toFixed(2)}m)</span>
              </div>
              <div className="text-[10px] text-white/40 font-medium">Subway &amp; Basin High Mark</div>
            </div>

            <div className="bg-[#111726] border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between min-h-[105px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Dewatering Pumps</span>
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-white">{metrics.totalPumps}</span>
                <span className="text-[11px] text-emerald-400 font-semibold">Active Pumps</span>
              </div>
              <div className="text-[10px] text-white/40 font-medium">High-Discharge Throttle</div>
            </div>

            <div className="bg-[#111726] border border-purple-500/30 rounded-2xl p-4 flex flex-col justify-between min-h-[105px] col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Population Protected</span>
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                </div>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-white">{(metrics.totalPop / 1000).toFixed(0)}k</span>
                <span className="text-[11px] text-purple-400 font-semibold">Citizens Warned</span>
              </div>
              <div className="text-[10px] text-white/40 font-medium">14 Municipal Catchments</div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. REGION FILTER & SEARCH — NO SCROLLBAR                         */}
      {/* ================================================================ */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="bg-[#0E1420] border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">

          {/* City Selector — responsive segmented control, no scrollbar */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-wider shrink-0 hidden xl:flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              Region:
            </span>
            {/* Desktop: pill row with flex-wrap — never scrolls */}
            <div className="hidden sm:flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#0A0E17] border border-white/10">
              {citySegments.map((city) => {
                const isActive = selectedCity === city.id;
                const count = city.id === 'all'
                  ? Object.values(cityAlertCounts).reduce((s, n) => s + n, 0)
                  : cityAlertCounts[city.id];
                return (
                  <button
                    key={city.id}
                    id={`city-filter-${city.id}`}
                    onClick={() => handleCityChange(city.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-[#F56A00] text-white shadow-sm shadow-[#F56A00]/30'
                        : 'text-white/70 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/10'
                    }`}
                  >
                    {city.label}
                    {count !== undefined && count > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ${isActive ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-400'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Mobile: compact dropdown */}
            <div className="sm:hidden relative flex-1">
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0E17] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#F56A00]/50 appearance-none cursor-pointer"
              >
                {citySegments.map((city) => (
                  <option key={city.id} value={city.id} className="bg-[#0A0E17]">
                    {city.label}{cityAlertCounts[city.id] ? ` (${cityAlertCounts[city.id]})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="alert-search-input"
                type="text"
                placeholder="Search street, ward, or corridor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-xs focus:outline-none focus:border-[#F56A00]/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-white/40 shrink-0" />
              <select
                id="severity-filter"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#0E1420]">All Severities</option>
                <option value="CRITICAL" className="bg-[#0E1420] text-red-400">🔴 Critical (&gt;0.7m)</option>
                <option value="WARNING" className="bg-[#0E1420] text-amber-400">🟠 Warning (&gt;0.4m)</option>
                <option value="ADVISORY" className="bg-[#0E1420] text-yellow-400">🟡 Advisory</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-white/40 shrink-0" />
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#0E1420]">All Status</option>
                <option value="ACTIVE" className="bg-[#0E1420] text-emerald-400">● Active</option>
                <option value="ESCALATED" className="bg-[#0E1420] text-red-400">▲ Escalated</option>
                <option value="MONITORING" className="bg-[#0E1420] text-blue-400">◐ Monitoring</option>
                <option value="RESOLVED" className="bg-[#0E1420] text-gray-400">✓ Resolved</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 3. ALERT CARDS GRID                                               */}
      {/* ================================================================ */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white">Street-by-Street Flood Predictions &amp; Inundation Warnings</h2>
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-mono font-bold text-white/70">
              {filteredAlerts.length} Alert{filteredAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/50">
            <Clock className="w-3.5 h-3.5" />
            <span>Radar Telemetry Synchronized</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-[#F56A00] animate-spin mb-3" />
            <p className="text-white/60 text-xs font-medium">Coupling Doppler radar nowcasts with 2D DEM drainage graphs...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-[#0E1420] border border-white/10 rounded-3xl p-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2.5" />
            <h3 className="text-base font-bold text-white">No Inundation Alerts Under Current Filters</h3>
            <p className="text-white/50 text-xs mt-1 max-w-md mx-auto">
              Hydraulic surcharge levels are within designed drainage velocity tolerances for selected criteria.
            </p>
            <button
              onClick={() => { setSelectedCity('all'); setSelectedSeverity('ALL'); setSelectedStatus('ALL'); setSearchQuery(''); }}
              className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredAlerts.map((alert) => {
              const isCritical = alert.severity === 'CRITICAL';
              const isWarning = alert.severity === 'WARNING';
              const isResolved = alert.status === 'RESOLVED';
              const isEscalated = alert.status === 'ESCALATED';
              const isAuditExpanded = expandedAuditId === alert.id;

              const cardBorder = isResolved
                ? 'border-emerald-500/20 bg-[#0C121D]/80 opacity-75'
                : isEscalated
                ? 'border-red-600/60 hover:border-red-500/80 bg-[#110A0A]'
                : isCritical
                ? 'border-red-500/40 hover:border-red-500/70 bg-[#0C121D]'
                : isWarning
                ? 'border-amber-500/40 hover:border-amber-500/70 bg-[#0C121D]'
                : 'border-yellow-500/30 hover:border-yellow-500/60 bg-[#0C121D]';

              const badgeColor = isResolved
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : isEscalated
                ? 'bg-red-700/30 text-red-300 border-red-600/50'
                : isCritical
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : isWarning
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';

              const statusColor = isResolved
                ? 'text-emerald-400'
                : isEscalated
                ? 'text-red-400'
                : alert.status === 'MONITORING'
                ? 'text-blue-400'
                : 'text-emerald-400';

              return (
                <div key={alert.id} className={`border ${cardBorder} rounded-3xl p-5 sm:p-6 shadow-2xl transition-all duration-200 flex flex-col justify-between group`}>

                  {/* Card Header: Badges + Status + Lead Time */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1.5 ${badgeColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isCritical || isEscalated ? 'bg-red-500 animate-ping' : isWarning ? 'bg-amber-500' : 'bg-yellow-400'}`} />
                          {alert.severity} ALERT
                        </span>
                        <span className="text-xs font-bold text-white/80 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                          {alert.cityName}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                          ● {alert.status}
                        </span>
                        {alert.confidencePct !== undefined && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                            <TrendingUp className="w-2.5 h-2.5" />
                            {alert.confidencePct}% confidence
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-bold text-[#F56A00] border border-[#F56A00]/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{alert.peakTime}</span>
                        </span>
                        <span className="text-[10px] text-white/40 font-mono block mt-0.5">{alert.id}</span>
                      </div>
                    </div>

                    {/* WHERE */}
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-white/50 font-semibold mb-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#F56A00]" />
                        <span>WHERE: {alert.hotspotName}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white leading-snug group-hover:text-[#F56A00] transition-colors">
                        {alert.headline}
                      </h3>
                    </div>

                    {/* HOW BAD: Telemetry Grid */}
                    <div className="grid grid-cols-3 gap-2.5 mt-3.5 p-3 rounded-2xl bg-[#111827] border border-white/5">
                      <div>
                        <span className="text-[9px] font-bold text-white/40 uppercase block">Max Water Depth</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className={`text-lg font-black font-mono ${isCritical || isEscalated ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-yellow-300'}`}>
                            {alert.predictedDepthCm}
                          </span>
                          <span className="text-[10px] font-bold text-white/60">cm</span>
                          <span className="text-[9px] text-white/40">({alert.predictedDepthM}m)</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isCritical || isEscalated ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-yellow-400'}`}
                            style={{ width: `${Math.min(100, (alert.predictedDepthCm / 100) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-white/40 uppercase block">Drain Surcharge</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black font-mono text-white">{alert.drainageSurchargePct}%</span>
                          <span className="text-[9px] text-red-400 font-semibold">Overcap</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1 mt-1 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${alert.drainageSurchargePct}%` }} />
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-white/40 uppercase block">Rain Intensity</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black font-mono text-cyan-400">{alert.rainfallIntensityMmHr}</span>
                          <span className="text-[10px] font-bold text-white/60">mm/hr</span>
                        </div>
                        <span className="text-[9px] text-cyan-300/70 font-medium block truncate mt-1">Radar Nowcast</span>
                      </div>
                    </div>

                    {/* WHY: Explainability */}
                    <div className="mt-3 p-3 rounded-xl bg-[#090E17] border border-white/10">
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/5">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                          <HelpCircle className="w-3 h-3 text-[#F56A00]" />
                          <span>WHY? — Hydrological Driver Attribution</span>
                        </div>
                        <span className="text-[9px] text-white/40 font-mono">Coupled Twin</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                        {[
                          { label: 'Rainfall', value: alert.explainability?.rainfallIntensityPct || 85, color: 'bg-cyan-400' },
                          { label: 'Surcharge', value: alert.explainability?.drainageSurchargePct || 92, color: 'bg-red-400' },
                          { label: 'Low DEM', value: alert.explainability?.elevationDepressionPct || 80, color: 'bg-amber-400' },
                          { label: 'Hist. Flood', value: alert.explainability?.historicalFloodFactorPct || 78, color: 'bg-purple-400' },
                        ].map((f) => (
                          <div key={f.label}>
                            <div className="flex justify-between text-white/60 text-[9px] mb-0.5">
                              <span>{f.label}</span>
                              <span className="font-bold text-white font-mono">{f.value}%</span>
                            </div>
                            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                              <div className={`${f.color} h-full rounded-full`} style={{ width: `${f.value}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      {alert.explainability?.primaryDriver && (
                        <p className="text-[10px] text-white/50 italic mt-2 pt-1.5 border-t border-white/5 leading-tight">
                          Driver: {alert.explainability.primaryDriver}
                        </p>
                      )}
                    </div>

                    {/* Affected Roads */}
                    <div className="mt-3">
                      <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">Inundated Arterial Corridors:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {alert.affectedRoads.map((road, rIdx) => (
                          <span key={rIdx} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-medium text-white/80">{road}</span>
                        ))}
                      </div>
                    </div>

                    {/* WHAT TO DO */}
                    <div className="mt-3 p-3 rounded-xl bg-red-950/20 border border-red-500/20 flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-white/80 leading-relaxed">
                        <strong className="text-red-300 block font-bold text-[11px]">WHAT TO DO (Civic &amp; Commuter Advisory):</strong>
                        {alert.instruction}
                      </div>
                    </div>

                    {/* Audit Trail (collapsible) */}
                    {alert.auditLog && alert.auditLog.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => setExpandedAuditId(isAuditExpanded ? null : alert.id)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          <span>Audit Trail ({alert.auditLog.length} events)</span>
                          <ChevronRight className={`w-3 h-3 transition-transform ${isAuditExpanded ? 'rotate-90' : ''}`} />
                        </button>
                        {isAuditExpanded && (
                          <div className="mt-2 pl-3 border-l border-white/10 space-y-1.5">
                            {alert.auditLog.map((entry, i) => (
                              <div key={i} className="flex items-start gap-2 text-[10px]">
                                <span className="text-white/40 font-mono shrink-0">{formatAuditTime(entry.timestamp)}</span>
                                <span className="text-white/70">{entry.action}</span>
                                <span className="text-[#F56A00]/70 shrink-0">— {entry.actor}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">

                    {/* Left: Pump status */}
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        <span>{alert.dewateringPumpsActive}/{alert.dewateringPumpsRequired} Pumps</span>
                      </span>
                      {!isResolved && (
                        <button
                          onClick={() => handleDeployPump(alert.id, alert.dewateringPumpsActive)}
                          id={`deploy-pump-${alert.id}`}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[10px] font-bold border border-white/10 transition-all cursor-pointer"
                          title="Deploy extra pump to hotspot"
                        >
                          +1 Pump
                        </button>
                      )}
                    </div>

                    {/* Right: Primary Actions (hierarchy: View on Map > Citizen SMS > CAP > Resolve) */}
                    <div className="flex items-center gap-2 flex-wrap">

                      {/* PRIMARY: View on Map */}
                      <button
                        onClick={() => handleViewOnMap(alert)}
                        id={`view-on-map-${alert.id}`}
                        className="px-3 py-1.5 rounded-xl bg-[#F56A00] hover:bg-[#FF7518] text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#F56A00]/20"
                        title="View on GIS Digital Twin Flood Map"
                      >
                        <NavIcon className="w-3.5 h-3.5" />
                        <span>View on Map</span>
                        <ArrowUpRight className="w-3 h-3 opacity-70" />
                      </button>

                      {/* Citizen SMS / WA */}
                      <button
                        onClick={() => { setSelectedAlertForBroadcast(alert); setBroadcastSent(false); }}
                        id={`broadcast-${alert.id}`}
                        className="px-3 py-1.5 rounded-xl bg-[#1C2638] hover:bg-[#25324A] text-white text-[11px] font-bold border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer hover:border-emerald-500/40"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Citizen SMS/WA</span>
                      </button>

                      {/* CAP v1.2 */}
                      <button
                        onClick={() => setSelectedAlertForCap(alert)}
                        id={`cap-${alert.id}`}
                        className="px-3 py-1.5 rounded-xl bg-[#1C2638] hover:bg-[#25324A] text-white text-[11px] font-bold border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer hover:border-cyan-400/50"
                      >
                        <Radio className="w-3.5 h-3.5 text-cyan-400" />
                        <span>CAP v1.2</span>
                      </button>

                      {/* Resolve / Escalate */}
                      {!isResolved ? (
                        <div className="flex items-center gap-1.5">
                          {!isEscalated && (
                            <button
                              onClick={() => handleUpdateStatus(alert.id, 'ESCALATED')}
                              id={`escalate-${alert.id}`}
                              className="px-2.5 py-1.5 rounded-xl bg-red-800/60 hover:bg-red-700 text-white text-[10px] font-bold transition-all cursor-pointer border border-red-600/40"
                            >
                              Escalate
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(alert.id, 'RESOLVED')}
                            id={`resolve-${alert.id}`}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Resolve
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-white/5 text-emerald-400/70 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Resolved
                          {alert.resolvedAt && <span className="text-white/30 font-mono ml-1">{formatAuditTime(alert.resolvedAt)}</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* 4. EMERGENCY RESPONSE FORCE ROSTER (City-Aware)                  */}
      {/* ================================================================ */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-10">
        <div className="bg-[#0E1420] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#F56A00]" />
                <span>NDRF &amp; Heavy Dewatering Response Force Roster</span>
                {selectedCity !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-[#F56A00]/15 text-[#F56A00] text-[10px] font-bold border border-[#F56A00]/30">
                    {CITY_NAME_MAP[selectedCity] || selectedCity.toUpperCase()}
                  </span>
                )}
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                {selectedCity === 'all'
                  ? 'National roster — real-time operational readiness of all municipal dewatering units, NDRF battalions, and traffic diversion teams.'
                  : `Showing ${CITY_NAME_MAP[selectedCity] || selectedCity} response units. Select "All Metros" for national view.`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                {filteredDispatchUnits.filter((u) => u.status === 'DEPLOYED' || u.status === 'EN_ROUTE').length} Active Dispatches
              </span>
            </div>
          </div>

          {filteredDispatchUnits.length === 0 ? (
            <div className="mt-6 py-10 text-center">
              <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">No response units configured for this city.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {filteredDispatchUnits.map((unit) => {
                const statusStyle = {
                  DEPLOYED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                  EN_ROUTE: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                  STANDBY: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                  AVAILABLE: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
                  OFFLINE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
                }[unit.status] || 'bg-white/10 text-white/70 border-white/20';

                const cityBadgeColor: Record<string, string> = {
                  mumbai: 'bg-orange-500/15 text-orange-400',
                  chennai: 'bg-blue-500/15 text-blue-400',
                  delhi: 'bg-red-500/15 text-red-400',
                  bengaluru: 'bg-purple-500/15 text-purple-400',
                  kolkata: 'bg-cyan-500/15 text-cyan-400',
                };

                return (
                  <div key={unit.id} className="bg-[#121A28] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all min-h-[160px]">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-white/70">{unit.id}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${cityBadgeColor[unit.cityId] || 'bg-white/10 text-white/60'}`}>
                            {CITY_NAME_MAP[unit.cityId]?.replace(' Metro', '') || unit.cityId.toUpperCase()}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold tracking-wider ${statusStyle}`}>
                          {unit.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-xs mt-2.5 line-clamp-2">{unit.unitName}</h4>
                      <p className="text-[10px] text-[#F56A00] font-semibold mt-0.5">{unit.capacity}</p>

                      <div className="mt-2.5 text-[11px] text-white/70 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-white/40 shrink-0" />
                          <span className="font-medium text-white/90 truncate">{unit.assignedHotspot}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/50 text-[10px]">
                          <span>{unit.crewLeader}</span>
                          <span>·</span>
                          <span className="font-mono text-white/80">{unit.contactNumber}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-white/40 font-mono">
                      <span>{unit.lastUpdated}</span>
                      <span className={unit.status === 'OFFLINE' ? 'text-rose-400' : 'text-emerald-400'}>
                        {unit.status === 'OFFLINE' ? 'Offline' : 'Telemetry OK'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODAL 1: CAP v1.2 EXPORT                                         */}
      {/* ================================================================ */}
      {selectedAlertForCap && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D131F] border border-white/15 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#111728]">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">OASIS CAP v1.2 Common Alerting Protocol</h3>
                  <span className="text-[11px] text-white/50">{selectedAlertForCap.capIdentifier}</span>
                </div>
              </div>
              <button onClick={() => setSelectedAlertForCap(null)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto font-mono text-xs text-cyan-300 bg-[#070A0F] leading-relaxed select-all">
              <pre className="whitespace-pre-wrap">{generateCapXml(selectedAlertForCap)}</pre>
            </div>
            <div className="p-4 border-t border-white/10 bg-[#111728] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-xs text-white/50">Interoperable payload for NDMA Sachet &amp; State Disaster EOCs.</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyCapToClipboard(selectedAlertForCap)}
                  id="cap-copy-btn"
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedCap ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCap ? 'Copied XML' : 'Copy XML'}</span>
                </button>
                <button
                  onClick={() => downloadCapXml(selectedAlertForCap)}
                  id="cap-download-btn"
                  className="px-3.5 py-2 rounded-xl bg-[#F56A00] hover:bg-[#FF7518] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .xml</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL 2: CITIZEN MULTI-CHANNEL BROADCAST SIMULATOR               */}
      {/* ================================================================ */}
      {selectedAlertForBroadcast && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D131F] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#111728]">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-[#F56A00]" />
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">Citizen Emergency Alert Broadcast Simulator</h3>
                  <span className="text-[11px] text-white/50">Target: {selectedAlertForBroadcast.hotspotName} Basin</span>
                </div>
              </div>
              <button onClick={() => { setSelectedAlertForBroadcast(null); window.speechSynthesis?.cancel(); setIsListening(false); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Tabs — context-aware */}
            <div className="px-5 pt-3.5 flex items-center gap-2 flex-wrap border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Language:</span>
              {broadcastLanguages.map((lang) => (
                <button
                  key={lang}
                  id={`lang-${lang}`}
                  onClick={() => { setSelectedLanguage(lang); window.speechSynthesis?.cancel(); setIsListening(false); }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedLanguage === lang ? 'bg-[#F56A00] text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {LANGUAGE_LABELS[lang]}
                </button>
              ))}

              {/* Listen Alert — Web Speech API */}
              <button
                onClick={() => handleListenAlert(selectedAlertForBroadcast, selectedLanguage)}
                id="listen-alert-btn"
                className={`ml-auto px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isListening
                    ? 'bg-amber-600 text-white border-amber-500 animate-pulse'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 border-white/10'
                }`}
                title="Listen to alert in selected language using browser TTS"
              >
                {isListening ? <Volume2 className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isListening ? 'Stop' : 'Listen Alert'}</span>
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Channel 1: Emergency SMS */}
              <div className="p-4 rounded-2xl bg-[#141C2B] border border-white/10">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs text-white/50">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-red-400" />
                    Government Emergency Cell Broadcast (SMS)
                  </span>
                  <span className="text-emerald-400 font-bold text-[10px]">Priority-1 Immediate</span>
                </div>
                <div className="mt-3 p-3 rounded-xl bg-black/40 text-xs font-mono text-white/90 leading-relaxed border border-white/5">
                  🚨 <strong>[MOES-NCMRWF JALRAKSHAK ALERT]</strong>
                  <br />
                  {selectedAlertForBroadcast.translations[selectedLanguage]?.headline || selectedAlertForBroadcast.headline}
                  <br /><br />
                  Water Depth: {selectedAlertForBroadcast.predictedDepthCm}cm. {selectedAlertForBroadcast.translations[selectedLanguage]?.instruction || selectedAlertForBroadcast.instruction}
                  <br />
                  Dial 1916 for Municipal Disaster Control.
                </div>
              </div>

              {/* Channel 2: WhatsApp */}
              <div className="p-4 rounded-2xl bg-[#141C2B] border border-white/10">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs text-white/50">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    WhatsApp Disaster Alert Channel
                  </span>
                  <span className="text-white/60 text-[10px]">Verified Business API</span>
                </div>
                <div className="mt-3 p-3.5 rounded-xl bg-[#0B2018] border border-emerald-500/20 text-xs text-white/90 leading-relaxed">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold pb-2 border-b border-emerald-500/20">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Urban Flood Flash Advisory · {selectedAlertForBroadcast.cityName}</span>
                  </div>
                  <p className="mt-2 font-medium">
                    {selectedAlertForBroadcast.translations[selectedLanguage]?.headline || selectedAlertForBroadcast.headline}
                  </p>
                  <p className="mt-1 text-white/70 text-[11px]">
                    Expected peak: {selectedAlertForBroadcast.peakTime}. Drainage surcharge: {selectedAlertForBroadcast.drainageSurchargePct}%.
                    {selectedAlertForBroadcast.confidencePct !== undefined && ` Prediction confidence: ${selectedAlertForBroadcast.confidencePct}%.`}
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white/80">📍 Live Detour Active</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] font-bold text-emerald-300">⚡ Pumps Deployed</span>
                    {selectedAlertForBroadcast.ndrfDispatched && <span className="px-2 py-0.5 rounded bg-blue-500/20 text-[10px] font-bold text-blue-300">🚤 NDRF Active</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-[#111728] flex items-center justify-between gap-3">
              <span className="text-[11px] text-white/50">
                Est. Reach: ~{selectedAlertForBroadcast.vulnerablePopulationEst.toLocaleString('en-IN')} devices in geofence
              </span>
              <button
                onClick={() => { setBroadcastSent(true); setTimeout(() => setSelectedAlertForBroadcast(null), 1800); }}
                id="dispatch-broadcast-btn"
                disabled={broadcastSent}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  broadcastSent ? 'bg-emerald-600 text-white' : 'bg-[#F56A00] hover:bg-[#FF7518] text-white shadow-lg shadow-[#F56A00]/20'
                }`}
              >
                {broadcastSent ? (
                  <><Check className="w-4 h-4" /><span>Broadcast Dispatched!</span></>
                ) : (
                  <><Send className="w-4 h-4" /><span>Dispatch Flash Broadcast</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL 3: ISSUE FLASH WARNING — Multi-Step Workflow                */}
      {/* ================================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D131F] border border-white/15 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#111728]">
              <div className="flex items-center gap-2.5">
                <Plus className="w-5 h-5 text-[#F56A00]" />
                <div>
                  <h3 className="font-bold text-white text-base">Issue Flash Flood Emergency Warning</h3>
                  <span className="text-xs text-white/50">
                    Step {createStep} of 3 — {createStep === 1 ? 'Location & Severity' : createStep === 2 ? 'Alert Details' : 'Preview & Confirm'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setIsCreateModalOpen(false); setCreateStep(1); }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step progress */}
            <div className="px-5 pt-3 flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${createStep >= s ? 'bg-[#F56A00] text-white' : 'bg-white/10 text-white/40'}`}>{s}</div>
                  {s < 3 && <div className={`flex-1 h-0.5 rounded-full ${createStep > s ? 'bg-[#F56A00]' : 'bg-white/10'}`} />}
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateAlert} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              {createStep === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/60 font-bold mb-1 uppercase text-[10px]">Metro Region</label>
                      <select value={newCity} onChange={(e) => setNewCity(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#F56A00]">
                        <option value="mumbai" className="bg-[#0D131F]">Mumbai Metro</option>
                        <option value="chennai" className="bg-[#0D131F]">Chennai Metro</option>
                        <option value="delhi" className="bg-[#0D131F]">Delhi NCR</option>
                        <option value="bengaluru" className="bg-[#0D131F]">Bengaluru Metro</option>
                        <option value="kolkata" className="bg-[#0D131F]">Kolkata Metro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/60 font-bold mb-1 uppercase text-[10px]">Severity Level</label>
                      <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value as AlertSeverity)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#F56A00]">
                        <option value="CRITICAL" className="bg-[#0D131F] text-red-400">🔴 Critical (&gt;0.70m)</option>
                        <option value="WARNING" className="bg-[#0D131F] text-amber-400">🟠 Surcharge Warning (&gt;0.40m)</option>
                        <option value="ADVISORY" className="bg-[#0D131F] text-yellow-400">🟡 Precautionary Advisory</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-white/60 font-bold mb-1 uppercase text-[10px]">Hotspot Basin / Inundation Zone</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. King's Circle Railway Bridge & Gandhi Market"
                      value={newHotspot}
                      onChange={(e) => setNewHotspot(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#F56A00]"
                    />
                  </div>
                </>
              )}

              {createStep === 2 && (
                <>
                  <div>
                    <label className="block text-white/60 font-bold mb-1 uppercase text-[10px]">Alert Headline</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Severe Flash Surcharge: 0.85m Water Level Exceeding Curb"
                      value={newHeadline}
                      onChange={(e) => setNewHeadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#F56A00]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-white/60 font-bold mb-1 uppercase text-[10px]">Depth (m)</label>
                      <input type="number" step="0.05" value={newDepth} onChange={(e) => setNewDepth(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#F56A00]" />
                    </div>
                    <div>
                      <label className="block text-white/60 font-bold mb-1 uppercase text-[10px]">Surcharge (%)</label>
                      <input type="number" value={newSurcharge} onChange={(e) => setNewSurcharge(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#F56A00]" />
                    </div>
                    <div>
                      <label className="block text-white/60 font-bold mb-1 uppercase text-[10px]">Rainfall (mm/hr)</label>
                      <input type="number" value={newRainfall} onChange={(e) => setNewRainfall(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#F56A00]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-white/60 font-bold mb-1 uppercase text-[10px]">Affected Roads (comma separated)</label>
                    <input type="text" placeholder="e.g. Dr Ambedkar Rd, Tilak Nagar Underpass, Sion Circle" value={newRoads} onChange={(e) => setNewRoads(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#F56A00]" />
                  </div>
                  <div>
                    <label className="block text-white/60 font-bold mb-1 uppercase text-[10px]">Hydrological Notes</label>
                    <textarea rows={2} placeholder="e.g. Downpour exceeded micro-culvert inlet flow threshold." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#F56A00]" />
                  </div>
                </>
              )}

              {createStep === 3 && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[#111827] border border-white/10">
                    <p className="text-[11px] text-white/50 font-bold uppercase tracking-wider mb-2">Preview — Citizen SMS Message</p>
                    <div className="p-3 rounded-xl bg-black/40 font-mono text-xs text-white/90 leading-relaxed border border-white/5">
                      🚨 <strong>[MOES-NCMRWF JALRAKSHAK ALERT]</strong><br />
                      {newHeadline || '(headline not set)'}<br /><br />
                      Water Depth: {Math.round(parseFloat(newDepth || '0') * 100)}cm. Avoid low-lying underpasses in {CITY_NAME_MAP[newCity]}.<br />
                      Dial 1916 for Municipal Disaster Control.
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex gap-2.5 text-[11px] text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>This alert will be immediately published to the NDMA CAP Registry and citizen broadcast channels for <strong>{CITY_NAME_MAP[newCity]}</strong>. Review carefully before dispatching.</span>
                  </div>
                </div>
              )}

              <div className={`pt-2 flex gap-2 ${createStep > 1 ? 'flex-row' : ''}`}>
                {createStep > 1 && (
                  <button type="button" onClick={() => setCreateStep((s) => (s - 1) as 1 | 2 | 3)} className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer">
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || (createStep === 1 && !newHotspot) || (createStep === 2 && !newHeadline)}
                  id="submit-alert-btn"
                  className="flex-1 py-2.5 rounded-xl bg-[#F56A00] hover:bg-[#FF7518] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#F56A00]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /><span>Broadcasting to CAP Gateway...</span></>
                  ) : createStep < 3 ? (
                    <><span>Next Step</span><ChevronRight className="w-4 h-4" /></>
                  ) : (
                    <><Send className="w-4 h-4" /><span>Publish &amp; Broadcast Live Alert</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsView;
