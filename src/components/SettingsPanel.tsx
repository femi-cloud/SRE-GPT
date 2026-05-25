import { Settings2 } from 'lucide-react';
import { ThresholdConfig } from '../types';

interface SettingsPanelProps {
  thresholds: ThresholdConfig;
  onThresholdChange: (config: ThresholdConfig) => void;
}

export function SettingsPanel({ thresholds, onThresholdChange }: SettingsPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          <Settings2 size={20} />
        </div>
        <h2 className="text-[17px] font-bold text-gray-800 dark:text-gray-100">Threshold Config</h2>
      </div>
      
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Latency Alert (ms)</label>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 px-2 py-0.5 rounded-md">{thresholds.latency} ms</span>
          </div>
          <input 
            type="range" 
            min="100" max="2500" step="50"
            value={thresholds.latency}
            onChange={(e) => onThresholdChange({ ...thresholds, latency: Number(e.target.value) })}
            className="w-full accent-indigo-600 dark:accent-indigo-400 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Error Rate Alert (%)</label>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 px-2 py-0.5 rounded-md">{(thresholds.errorRate * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0.01" max="0.5" step="0.01"
            value={thresholds.errorRate}
            onChange={(e) => onThresholdChange({ ...thresholds, errorRate: Number(e.target.value) })}
            className="w-full accent-indigo-600 dark:accent-indigo-400 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
