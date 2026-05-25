import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export function KpiCard({ 
  title, 
  value, 
  icon, 
  status,
  prevValue,
  lowerIsBetter = false
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  status: 'normal' | 'danger';
  prevValue?: string;
  lowerIsBetter?: boolean;
}) {
  const isDanger = status === 'danger';

  // Helper to parse numeric part
  const parseVal = (valStr: string): number => {
    const cleaned = valStr.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const curNum = parseVal(value);
  const prevNum = prevValue ? parseVal(prevValue) : undefined;
  const diff = prevNum !== undefined ? curNum - prevNum : 0;
  
  // Determine trend direction (diff > 0 means increased/Up, diff < 0 means decreased/Down)
  const isUp = diff > 0;
  const isDown = diff < 0;
  
  // Determine if this trend is an improvement or degradation
  // lowerIsBetter means down/decrease is improvement (green), up/increase is degradation (red)
  // higherIsBetter (lowerIsBetter = false) means up/increase is improvement (green), down/decrease is degradation (red)
  const isImprovement = lowerIsBetter ? isDown : isUp;
  const hasChanged = prevNum !== undefined && Math.abs(diff) > 0.001;

  return (
    <div className={`p-6 rounded-2xl border backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-all duration-300 hover:scale-[1.01] ${
      isDanger 
        ? 'bg-red-500/10 dark:bg-red-500/15 border-red-500/30 dark:border-red-500/40' 
        : 'bg-white/5 dark:bg-gray-800/20 border-white/10 dark:border-gray-700/50'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl transition-colors ${isDanger ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
          {icon}
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h3>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className={`text-4xl font-bold tracking-tight transition-colors ${isDanger ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
          {value}
        </div>
        
        {hasChanged && (
          <div 
            className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
              isImprovement 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
            }`}
            title={`Previous value: ${prevValue}`}
          >
            {isUp ? (
              <ArrowUp size={14} className="stroke-[3]" />
            ) : (
              <ArrowDown size={14} className="stroke-[3]" />
            )}
            <span className="font-mono">
              {Math.abs(diff).toFixed(diff % 1 === 0 ? 0 : 1)}
              {value.includes('%') ? '%' : value.includes('ms') ? ' ms' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
