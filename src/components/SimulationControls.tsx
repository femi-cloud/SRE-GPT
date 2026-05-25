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
    <div className="bg-white/5 dark:bg-gray-800/20 backdrop-blur-xl p-6 rounded-2xl border border-white/10 dark:border-gray-700/50 shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <Activity size={20} />
          </div>
          <h2 className="text-[17px] font-bold text-gray-800 dark:text-gray-100">{loc.title}</h2>
        </div>
        
        {/* Play/Pause Button */}
        <button 
          onClick={onToggleSim}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border transition-all cursor-pointer ${
            isSimPlaying 
              ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' 
              : 'bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse'
          }`}
        >
          {isSimPlaying ? (
            <>
              <Pause size={12} className="fill-indigo-500" />
              <span>{loc.playing}</span>
            </>
          ) : (
            <>
              <Play size={12} className="fill-amber-500" />
              <span>{loc.paused}</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Traffic Profile Selector */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
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
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.03]'
                      : 'bg-white/5 hover:bg-white/10 text-gray-700 dark:text-gray-300 border-white/5'
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
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
            {loc.chaos}
          </label>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onInjectFault('latency')}
              disabled={!isSimPlaying}
              className={`flex items-center justify-between py-2 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeFault === 'latency'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-gray-700 dark:text-gray-300 border-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeFault === 'latency' ? 'bg-amber-500 animate-ping' : 'bg-gray-400'}`} />
                <span>{loc.injectLatency}</span>
              </div>
              <Zap size={15} className={activeFault === 'latency' ? 'text-amber-500' : 'text-gray-400'} />
            </button>

            <button
              onClick={() => onInjectFault('error')}
              disabled={!isSimPlaying}
              className={`flex items-center justify-between py-2 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeFault === 'error'
                  ? 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400 shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-gray-700 dark:text-gray-300 border-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeFault === 'error' ? 'bg-red-500 animate-ping' : 'bg-gray-400'}`} />
                <span>{loc.injectError}</span>
              </div>
              <AlertOctagon size={15} className={activeFault === 'error' ? 'text-red-500' : 'text-gray-400'} />
            </button>

            <button
              onClick={() => onInjectFault('both')}
              disabled={!isSimPlaying}
              className={`flex items-center justify-between py-2 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeFault === 'both'
                  ? 'bg-purple-500/15 border-purple-500 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-gray-700 dark:text-gray-300 border-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeFault === 'both' ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'}`} />
                <span>{loc.injectBoth}</span>
              </div>
              <ShieldAlert size={15} className={activeFault === 'both' ? 'text-purple-500' : 'text-gray-400'} />
            </button>

            {/* Clear Fault / Recover Button */}
            <button
              onClick={() => onInjectFault('none')}
              disabled={!isSimPlaying || activeFault === 'none'}
              className="mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-md transition-all cursor-pointer disabled:bg-gray-100 disabled:text-gray-450 dark:disabled:bg-white/5 dark:disabled:text-gray-505 disabled:opacity-40 disabled:cursor-not-allowed"
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
