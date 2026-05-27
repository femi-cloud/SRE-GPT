import { Settings2 } from 'lucide-react';
import { ThresholdConfig } from '../types';

interface SettingsPanelProps {
  thresholds: ThresholdConfig;
  onThresholdChange: (config: ThresholdConfig) => void;
}

export function SettingsPanel({ thresholds, onThresholdChange }: SettingsPanelProps) {
  return (
    <div className="glass-card p-6 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
          <Settings2 size={20} />
        </div>
        <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Threshold Config</h2>
      </div>
      
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Latency Alert (ms)</label>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/20 px-2 py-0.5 rounded-md">{thresholds.latency} ms</span>
          </div>
          <input 
            type="range" 
            min="100" max="2500" step="50"
            value={thresholds.latency}
            onChange={(e) => onThresholdChange({ ...thresholds, latency: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">Error Rate Alert (%)</label>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/20 px-2 py-0.5 rounded-md">{(thresholds.errorRate * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0.01" max="0.5" step="0.01"
            value={thresholds.errorRate}
            onChange={(e) => onThresholdChange({ ...thresholds, errorRate: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
