import React from 'react';
import { Play, Pause, AlertOctagon, RefreshCw, Activity, Zap, ShieldAlert } from 'lucide-react';

interface SimulationControlsProps {
  isSimPlaying: boolean;
  onToggleSim: () => void;
  activeFault: 'none' | 'latency' | 'error' | 'both';
  onInjectFault: (fault: 'none' | 'latency' | 'error' | 'both') => void;
  trafficProfile: 'normal' | 'peak' | 'quiet';
  onChangeProfile: (profile: 'normal' | 'peak' | 'quiet') => void;
  lang: 'en' | 'fr';
}

export function SimulationControls({
  isSimPlaying,
  onToggleSim,
  activeFault,
  onInjectFault,
  trafficProfile,
  onChangeProfile,
  lang
}: SimulationControlsProps) {

  const loc = {
    en: {
      title: "Fault Simulator",
      simulation: "Real-time Simulation",
      playing: "RUNNING",
      paused: "PAUSED",
      traffic: "Traffic Profile",
      normal: "Normal Load",
      peak: "Peak Load",
      quiet: "Low Load",
      chaos: "Inject Faults",
      injectLatency: "Latency Spike (1.2s+)",
      injectError: "Error Spike (15%+)",
      injectBoth: "Total Outage",
      clearAll: "Recover / Standby",
      activeText: "System Active"
    },
    fr: {
      title: "Injecteur de Fautes",
      simulation: "Simulation en temps réel",
      playing: "EN COURS",
      paused: "PAUSÉ",
      traffic: "Profil de Trafic",
      normal: "Charge Normale",
      peak: "Pic d'Affluence",
      quiet: "Faible Charge",
      chaos: "Injecter des Erreurs",
      injectLatency: "Pic Latence (1.2s+)",
      injectError: "Pic d'Erreurs (15%+)",
      injectBoth: "Panne Totale",
      clearAll: "Rétablir / Attente",
      activeText: "Système Actif"
    }
  }[lang];

  return (
    <div className="glass-card p-6 border border-slate-200/50 dark:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
            <Activity size={20} />
          </div>
          <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">{loc.title}</h2>
        </div>
        
        {/* Play/Pause Button */}
        <button 
          onClick={onToggleSim}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border transition-all cursor-pointer ${
            isSimPlaying 
              ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/35 dark:border-indigo-500/45' 
              : 'bg-amber-500/20 text-amber-650 dark:text-amber-400 border-amber-500/35 dark:border-amber-500/45 animate-pulse'
          }`}
        >
          {isSimPlaying ? (
            <>
              <Pause size={12} className="fill-indigo-500 dark:fill-indigo-400" />
              <span>{loc.playing}</span>
            </>
          ) : (
            <>
              <Play size={12} className="fill-amber-600 dark:fill-amber-400" />
              <span>{loc.paused}</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Traffic Profile Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
            {loc.traffic}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['quiet', 'normal', 'peak'] as const).map((p) => {
              const isActive = trafficProfile === p;
              const labels = { quiet: loc.quiet, normal: loc.normal, peak: loc.peak };
              return (
                <button
                  key={p}
                  onClick={() => onChangeProfile(p)}
                  disabled={!isSimPlaying}
                  className={`py-2 px-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-600/90 dark:border-indigo-500/80 shadow-md scale-[1.03]'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fault Injection Options */}
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
            {loc.chaos}
          </label>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onInjectFault('latency')}
              disabled={!isSimPlaying}
              className={`flex items-center justify-between py-2 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeFault === 'latency'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeFault === 'latency' ? 'bg-amber-500 animate-ping' : 'bg-slate-400 dark:bg-gray-600'}`} />
                <span>{loc.injectLatency}</span>
              </div>
              <Zap size={15} className={activeFault === 'latency' ? 'text-amber-500 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'} />
            </button>

            <button
              onClick={() => onInjectFault('error')}
              disabled={!isSimPlaying}
              className={`flex items-center justify-between py-2 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeFault === 'error'
                  ? 'bg-red-500/20 border-red-500 text-red-600 dark:text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)] shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeFault === 'error' ? 'bg-red-500 animate-ping' : 'bg-slate-400 dark:bg-gray-600'}`} />
                <span>{loc.injectError}</span>
              </div>
              <AlertOctagon size={15} className={activeFault === 'error' ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'} />
            </button>

            <button
              onClick={() => onInjectFault('both')}
              disabled={!isSimPlaying}
              className={`flex items-center justify-between py-2 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeFault === 'both'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeFault === 'both' ? 'bg-purple-500 animate-pulse' : 'bg-slate-400 dark:bg-gray-600'}`} />
                <span>{loc.injectBoth}</span>
              </div>
              <ShieldAlert size={15} className={activeFault === 'both' ? 'text-purple-500 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'} />
            </button>

            {/* Clear Fault / Recover Button */}
            <button
              onClick={() => onInjectFault('none')}
              disabled={!isSimPlaying || activeFault === 'none'}
              className="mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-all cursor-pointer disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:text-slate-400 dark:disabled:text-gray-550 disabled:opacity-40"
            >
              <RefreshCw size={15} className={activeFault !== 'none' ? 'animate-spin' : ''} />
              <span>{loc.clearAll}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
