import React from 'react';

export function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="glass-card p-6 flex flex-col transition-colors border-slate-200/50 dark:border-white/10">
      <h3 className="text-[17px] font-bold text-slate-900 dark:text-white mb-6">{title}</h3>
      <div className="flex-1 w-full min-h-[260px]">
        {children}
      </div>
    </div>
  );
}
