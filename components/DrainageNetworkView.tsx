'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitFork,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Zap,
  Filter,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  Gauge,
  Waves,
  Settings2,
  Radio,
  Clock,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface PumpStation {
  activePumps: number;
  totalPumps: number;
  discharge_Ls: number;
  fuelLevel_pct: number;
  sluiceGate: 'open' | 'closed' | 'partial';
  autoMode: boolean;
}

interface DrainageConduit {
  name: string;
  type: 'trunk' | 'nullah' | 'culvert' | 'pumping_station' | 'outfall';
  status: 'critical' | 'surcharged' | 'active' | 'normal' | 'tidal_lock' | 'offline';
  statusLabel: string;
  flowRate_m3s: number;
  surcharge_pct: number;
  diameter_m: number;
  waterDepth_m: number;
  siltation_pct: number;
  coordinates: [number, number][];
  pumpStation?: PumpStation;
}

interface DrainageSummary {
  totalConduits: number;
  criticalCount: number;
  surcharedCount: number;
  tidalLockCount: number;
  totalFlowRate_m3s: number;
  avgSurcharge_pct: number;
  pumpStationCount: number;
  totalActivePumps: number;
  totalPumps: number;
  totalDischarge_Ls: number;
  overallSystemHealth: 'CRITICAL' | 'DEGRADED' | 'CAUTION' | 'NOMINAL';
}

interface DrainageApiResponse {
  status: string;
  city: string;
  cityName: string;
  summary: DrainageSummary;
  network: DrainageConduit[];
  fetchedAt: string;
}

interface DrainageNetworkViewProps {
  cityId: string;
  cityName: string;
}

// ─── Helper utilities ───────────────────────────────────────────────────────
const STATUS_CONFIG = {
  critical:    { label: 'Critical',    color: '#EF4444', bg: 'bg-red-500/15',    border: 'border-red-500/40',    icon: AlertTriangle, textColor: 'text-red-400' },
  surcharged:  { label: 'Surcharged',  color: '#F97316', bg: 'bg-orange-500/15', border: 'border-orange-500/40', icon: Waves,         textColor: 'text-orange-400' },
  active:      { label: 'Active',      color: '#38BDF8', bg: 'bg-sky-500/15',    border: 'border-sky-500/40',    icon: Activity,      textColor: 'text-sky-400' },
  normal:      { label: 'Normal',      color: '#10B981', bg: 'bg-emerald-500/15',border: 'border-emerald-500/40',icon: CheckCircle2,  textColor: 'text-emerald-400' },
  tidal_lock:  { label: 'Tidal Lock',  color: '#A855F7', bg: 'bg-purple-500/15', border: 'border-purple-500/40', icon: Waves,         textColor: 'text-purple-400' },
  offline:     { label: 'Offline',     color: '#6B7280', bg: 'bg-gray-500/15',   border: 'border-gray-500/40',   icon: AlertTriangle, textColor: 'text-gray-400' },
};

const TYPE_LABELS: Record<string, string> = {
  trunk:           'Trunk Channel',
  nullah:          'Nullah',
  culvert:         'Storm Culvert',
  pumping_station: 'Pumping Station',
  outfall:         'Tidal Outfall',
};

const HEALTH_CONFIG = {
  CRITICAL: { label: 'CRITICAL', color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/40' },
  DEGRADED: { label: 'DEGRADED', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/40' },
  CAUTION:  { label: 'CAUTION',  color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/40' },
  NOMINAL:  { label: 'NOMINAL',  color: 'text-emerald-400',bg: 'bg-emerald-500/15',border: 'border-emerald-500/40' },
};

function SurchargeBar({ pct, small }: { pct: number; small?: boolean }) {
  const color =
    pct >= 90 ? 'from-red-600 to-red-400'
    : pct >= 75 ? 'from-orange-600 to-orange-400'
    : pct >= 60 ? 'from-yellow-600 to-yellow-400'
    : 'from-emerald-600 to-emerald-400';
  return (
    <div className={`w-full ${small ? 'h-1.5' : 'h-2'} rounded-full bg-white/10 overflow-hidden`}>
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function FuelBar({ pct }: { pct: number }) {
  const color = pct <= 25 ? 'from-red-600 to-red-400' : pct <= 50 ? 'from-yellow-600 to-yellow-400' : 'from-emerald-600 to-emerald-400';
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── KPI Header Card ────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-[#111827] border border-white/10 rounded-2xl p-3.5 flex items-start gap-3 flex-1 min-w-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-white/50 font-medium uppercase tracking-wide truncate">{label}</div>
        <div className="text-[18px] font-extrabold text-white leading-tight">{value}</div>
        {sub && <div className="text-[10px] text-white/40 font-mono truncate">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Pump Station Card ─────────────────────────────────────────────────────
function PumpStationCard({ conduit }: { conduit: DrainageConduit }) {
  const [autoMode, setAutoMode] = useState(conduit.pumpStation?.autoMode ?? true);
  const ps = conduit.pumpStation!;
  const cfg = STATUS_CONFIG[conduit.status];
  const StatusIcon = cfg.icon;

  return (
    <div className={`bg-[#111827] border rounded-2xl p-4 flex flex-col gap-3 transition-all hover:border-[#F56A00]/30 ${cfg.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.bg}`}>
            <Zap className={`w-4 h-4 ${cfg.textColor}`} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-white leading-tight">{conduit.name}</div>
            <div className="text-[10px] text-white/40 font-mono">{TYPE_LABELS[conduit.type]}</div>
          </div>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${cfg.bg} ${cfg.border} ${cfg.textColor}`}>
          <StatusIcon className="w-2.5 h-2.5" />
          {cfg.label}
        </span>
      </div>

      {/* Pump status */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/5 rounded-xl p-2">
          <div className="text-[18px] font-extrabold text-white">{ps.activePumps}/{ps.totalPumps}</div>
          <div className="text-[9px] text-white/40 uppercase">Pumps Online</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2">
          <div className="text-[18px] font-extrabold text-sky-400">{(ps.discharge_Ls / 1000).toFixed(1)}</div>
          <div className="text-[9px] text-white/40 uppercase">m³/s Discharge</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2">
          <div className={`text-[18px] font-extrabold ${ps.fuelLevel_pct <= 25 ? 'text-red-400' : ps.fuelLevel_pct <= 50 ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {ps.fuelLevel_pct}%
          </div>
          <div className="text-[9px] text-white/40 uppercase">DG Fuel</div>
        </div>
      </div>

      {/* Fuel bar */}
      <div>
        <div className="flex justify-between text-[10px] text-white/40 mb-1">
          <span>Generator Fuel</span>
          {ps.fuelLevel_pct <= 25 && (
            <span className="text-red-400 font-bold animate-pulse">LOW FUEL</span>
          )}
        </div>
        <FuelBar pct={ps.fuelLevel_pct} />
      </div>

      {/* Surcharge */}
      <div>
        <div className="flex justify-between text-[10px] text-white/40 mb-1">
          <span>Conduit Surcharge</span>
          <span className="font-mono font-bold text-white">{conduit.surcharge_pct}%</span>
        </div>
        <SurchargeBar pct={conduit.surcharge_pct} small />
      </div>

      {/* Sluice Gate & Mode */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${
            ps.sluiceGate === 'open' ? 'bg-emerald-400' :
            ps.sluiceGate === 'partial' ? 'bg-yellow-400' : 'bg-red-400'
          }`} />
          <span className="text-[10px] text-white/60 capitalize">Gate: {ps.sluiceGate}</span>
        </div>
        {/* Auto / Manual toggle */}
        <button
          onClick={() => setAutoMode(p => !p)}
          className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
            autoMode
              ? 'bg-[#F56A00]/20 border-[#F56A00]/40 text-[#F56A00]'
              : 'bg-white/5 border-white/15 text-white/60 hover:text-white'
          }`}
        >
          <Settings2 className="w-2.5 h-2.5" />
          {autoMode ? 'AUTO' : 'MANUAL'}
        </button>
      </div>
    </div>
  );
}

// ─── Conduit Row ────────────────────────────────────────────────────────────
function ConduitRow({ conduit, onExpand, expanded }: {
  conduit: DrainageConduit;
  onExpand: () => void;
  expanded: boolean;
}) {
  const cfg = STATUS_CONFIG[conduit.status];
  const StatusIcon = cfg.icon;

  return (
    <div className={`rounded-xl border transition-all ${expanded ? `${cfg.border} bg-[#111827]` : 'border-white/8 bg-[#0E1420] hover:border-white/20'}`}>
      {/* Row Header */}
      <button
        onClick={onExpand}
        className="w-full text-left p-3 flex items-center gap-3 cursor-pointer"
      >
        {/* Status dot */}
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
          style={{ backgroundColor: cfg.color }}
        />

        {/* Name + type */}
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-white truncate">{conduit.name}</div>
          <div className="text-[10px] text-white/40">{TYPE_LABELS[conduit.type]}</div>
        </div>

        {/* Surcharge bar + pct */}
        <div className="hidden sm:flex flex-col items-end gap-1 w-24 shrink-0">
          <span className={`text-[11px] font-extrabold font-mono ${cfg.textColor}`}>{conduit.surcharge_pct}%</span>
          <SurchargeBar pct={conduit.surcharge_pct} small />
        </div>

        {/* Flow */}
        <div className="hidden md:block text-right w-20 shrink-0">
          <div className="text-[12px] font-bold text-sky-400 font-mono">{conduit.flowRate_m3s}</div>
          <div className="text-[9px] text-white/30">m³/s</div>
        </div>

        {/* Status badge */}
        <span className={`hidden lg:flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${cfg.bg} ${cfg.border} ${cfg.textColor} shrink-0`}>
          <StatusIcon className="w-2.5 h-2.5" />
          {cfg.label}
        </span>

        {/* Expand toggle */}
        <span className="text-white/30 ml-1 shrink-0">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/8 pt-3">
          <p className="text-[10px] text-white/40 font-medium italic">{conduit.statusLabel}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[
              { label: 'Diameter', value: `${conduit.diameter_m} m`, color: 'text-white' },
              { label: 'Water Depth', value: `${conduit.waterDepth_m} m`, color: conduit.waterDepth_m >= conduit.diameter_m * 0.9 ? 'text-red-400' : 'text-sky-400' },
              { label: 'Flow Rate', value: `${conduit.flowRate_m3s} m³/s`, color: 'text-sky-400' },
              { label: 'Siltation', value: `${conduit.siltation_pct}%`, color: conduit.siltation_pct >= 50 ? 'text-orange-400' : 'text-white/70' },
            ].map(d => (
              <div key={d.label} className="bg-white/5 rounded-xl p-2">
                <div className={`text-[14px] font-extrabold ${d.color}`}>{d.value}</div>
                <div className="text-[9px] text-white/40 uppercase">{d.label}</div>
              </div>
            ))}
          </div>
          {/* Siltation warning */}
          {conduit.siltation_pct >= 50 && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-[10px] text-orange-300 font-medium">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>Siltation above 50% — Desiltation maintenance recommended</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function DrainageNetworkView({ cityId, cityName }: DrainageNetworkViewProps) {
  const [data, setData] = useState<DrainageApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/drainage/telemetry?city=${cityId}`);
      if (!res.ok) throw new Error(`Failed to fetch drainage telemetry`);
      const json: DrainageApiResponse = await res.json();
      setData(json);
      setLastFetched(new Date());
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cityId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 45000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter conduits
  const filteredNetwork = (data?.network ?? []).filter(n => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterStatus !== 'all' && n.status !== filterStatus) return false;
    return true;
  });

  const pumpStations = (data?.network ?? []).filter(n => n.pumpStation != null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-2 border-[#F56A00]/40 border-t-[#F56A00] rounded-full animate-spin" />
        <span className="text-[12px] text-white/40 font-medium">Loading drainage network telemetry…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <span className="text-[13px] text-white/60">{error || 'No data available'}</span>
        <button onClick={() => fetchData()} className="text-[12px] text-[#F56A00] hover:underline cursor-pointer">Retry</button>
      </div>
    );
  }

  const { summary } = data;
  const healthCfg = HEALTH_CONFIG[summary.overallSystemHealth];

  return (
    <div className="flex flex-col gap-5 w-full">

      {/* ── Section Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F56A00]/15 border border-[#F56A00]/30 flex items-center justify-center">
            <GitFork className="w-4.5 h-4.5 text-[#F56A00]" />
          </div>
          <div>
            <h2 className="text-[15px] font-extrabold text-white">Drainage Network Intelligence</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">{cityName} Hydrodynamic Monitor</span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${healthCfg.bg} ${healthCfg.border} ${healthCfg.color}`}>
                {healthCfg.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastFetched && (
            <div className="flex items-center gap-1 text-[10px] text-white/30 font-mono">
              <Clock className="w-3 h-3" />
              {lastFetched.toLocaleTimeString('en-IN', { hour12: false })}
            </div>
          )}
          <button
            onClick={() => fetchData(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] text-white font-bold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-[#F56A00]' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Avg Surcharge"
          value={`${summary.avgSurcharge_pct}%`}
          sub={`${summary.totalConduits} conduits tracked`}
          icon={Gauge}
          color={`${summary.avgSurcharge_pct >= 85 ? 'bg-red-500/20 text-red-400' : summary.avgSurcharge_pct >= 70 ? 'bg-orange-500/20 text-orange-400' : 'bg-sky-500/20 text-sky-400'}`}
        />
        <KpiCard
          label="Total Discharge"
          value={`${summary.totalFlowRate_m3s.toFixed(0)} m³/s`}
          sub={`${summary.totalDischarge_Ls.toLocaleString()} L/s pumped`}
          icon={Droplets}
          color="bg-sky-500/20 text-sky-400"
        />
        <KpiCard
          label="Pump Stations"
          value={`${summary.totalActivePumps}/${summary.totalPumps}`}
          sub={`${summary.pumpStationCount} stations online`}
          icon={Zap}
          color={summary.totalActivePumps < summary.totalPumps ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}
        />
        <KpiCard
          label="Critical Alerts"
          value={`${summary.criticalCount + summary.tidalLockCount}`}
          sub={`${summary.surcharedCount} surcharged, ${summary.tidalLockCount} tidal lock`}
          icon={AlertTriangle}
          color={summary.criticalCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}
        />
      </div>

      {/* ── Tidal Lock Warning Banner ──────────────────────────────────────── */}
      {summary.tidalLockCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-[12px] text-purple-200">
          <Waves className="w-4 h-4 text-purple-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <div className="font-extrabold text-purple-300 mb-0.5">⚠ Tidal Gate Lock Detected</div>
            <span className="text-purple-300/80">
              {summary.tidalLockCount} outfall(s) experiencing tidal backflow lock. Sea level exceeds invert discharge elevation. Gravity drainage is inhibited — pump outfalls must compensate.
            </span>
          </div>
        </div>
      )}

      {/* ── Pumping Station Telemetry Cards ───────────────────────────────── */}
      {pumpStations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-[#F56A00]" />
            <h3 className="text-[12px] font-extrabold text-white uppercase tracking-wider">Pumping Station Telemetry</h3>
            <span className="text-[10px] font-mono text-white/30">Live</span>
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pumpStations.map((ps, i) => (
              <PumpStationCard key={i} conduit={ps} />
            ))}
          </div>
        </div>
      )}

      {/* ── Conduit Table ─────────────────────────────────────────────────── */}
      <div>
        {/* Table header + filters */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#F56A00]" />
            <h3 className="text-[12px] font-extrabold text-white uppercase tracking-wider">Conduit & Channel Monitor</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-white/30" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="bg-[#111827] border border-white/10 text-[11px] text-white/70 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-[#F56A00]/50"
              >
                <option value="all">All Types</option>
                <option value="trunk">Trunk Channels</option>
                <option value="nullah">Nullahs</option>
                <option value="culvert">Culverts</option>
                <option value="pumping_station">Pumping Stations</option>
                <option value="outfall">Outfalls</option>
              </select>
            </div>
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-[#111827] border border-white/10 text-[11px] text-white/70 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-[#F56A00]/50"
            >
              <option value="all">All Statuses</option>
              <option value="critical">Critical</option>
              <option value="surcharged">Surcharged</option>
              <option value="tidal_lock">Tidal Lock</option>
              <option value="active">Active</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>

        {/* Conduit rows */}
        {filteredNetwork.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-white/30 gap-2">
            <Info className="w-6 h-6" />
            <span className="text-[12px]">No conduits match the selected filters.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNetwork.map((conduit, i) => (
              <ConduitRow
                key={i}
                conduit={conduit}
                expanded={expandedIdx === i}
                onExpand={() => setExpandedIdx(prev => prev === i ? null : i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Siltation Health Matrix ────────────────────────────────────────── */}
      <div className="bg-[#0D121C] border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-3.5 h-3.5 text-white/40" />
          <h3 className="text-[12px] font-bold text-white">Siltation Health Digest</h3>
        </div>
        <div className="space-y-2">
          {(data?.network ?? [])
            .slice()
            .sort((a, b) => b.siltation_pct - a.siltation_pct)
            .slice(0, 5)
            .map((n, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] text-white/60 truncate flex-1">{n.name}</span>
                <div className="w-28 shrink-0">
                  <SurchargeBar pct={n.siltation_pct} small />
                </div>
                <span className={`text-[11px] font-mono font-bold w-9 text-right shrink-0 ${
                  n.siltation_pct >= 50 ? 'text-orange-400' : 'text-white/60'
                }`}>{n.siltation_pct}%</span>
              </div>
          ))}
        </div>
      </div>

    </div>
  );
}
