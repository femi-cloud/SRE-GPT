import React from 'react';

export function KpiCard({ title, value, icon, status }: { title: string, value: string, icon: React.ReactNode, status: 'normal' | 'danger' }) {
  const isDanger = status === 'danger';
  return (
    <div className={`p-6 rounded-2xl border ${isDanger ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'} shadow-sm transition-colors duration-300`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl transition-colors ${isDanger ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
          {icon}
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h3>
      </div>
      <div className={`text-4xl font-bold tracking-tight transition-colors ${isDanger ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </div>
    </div>
  );
}
