import React from 'react';

export function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white/5 dark:bg-gray-800/20 backdrop-blur-xl p-6 rounded-2xl border border-white/10 dark:border-gray-700/50 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex flex-col transition-colors">
      <h3 className="text-[17px] font-bold text-gray-800 dark:text-gray-100 mb-6">{title}</h3>
      <div className="flex-1 w-full min-h-[260px]">
        {children}
      </div>
    </div>
  );
}
