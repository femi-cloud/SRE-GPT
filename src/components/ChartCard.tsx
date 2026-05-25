import React from 'react';

export function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col transition-colors">
      <h3 className="text-[17px] font-bold text-gray-800 dark:text-gray-100 mb-6">{title}</h3>
      <div className="flex-1 w-full min-h-[260px]">
        {children}
      </div>
    </div>
  );
}
