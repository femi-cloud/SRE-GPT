import { History, Download, Search } from 'lucide-react';
import { IncidentReport } from '../types';
import { useState } from 'react';

interface RecentIncidentsProps {
  incidents: IncidentReport[];
}

export function RecentIncidents({ incidents }: RecentIncidentsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleDownloadSingle = (incident: IncidentReport) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incident, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `incident_${incident.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const filteredIncidents = incidents.filter(inc => 
    inc.analysis.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inc.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (incidents.length === 0 && !searchTerm) return null;

  return (
    <div className="bg-white/5 dark:bg-gray-800/20 backdrop-blur-xl p-6 rounded-2xl border border-white/10 dark:border-gray-700/50 shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-colors mt-6 flex flex-col max-h-[600px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          <History size={20} />
        </div>
        <h2 className="text-[17px] font-bold text-gray-800 dark:text-gray-100">Recent Incidents</h2>
      </div>

      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search size={16} />
        </div>
        <input
          id="incident-search"
          type="text"
          placeholder="Search incidents (Press 's' to focus)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {filteredIncidents.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No matching incidents.</p>
        ) : (
          filteredIncidents.map(inc => (
          <div key={inc.id} className="p-4 rounded-xl border border-white/5 dark:border-gray-750/30 bg-white/5 dark:bg-gray-900/40">
            <div className="flex justify-between items-start mb-3 gap-2">
              <span className="text-[11px] font-bold px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 uppercase tracking-wider shrink-0">
                {new Date(inc.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <button 
                onClick={() => handleDownloadSingle(inc)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-300 dark:hover:bg-indigo-500/20 transition-colors"
                title="Download JSON Report"
              >
                <Download size={16} />
              </button>
            </div>
            
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{inc.action}</p>
            <p className="text-[13px] text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
              {inc.analysis}
            </p>
          </div>
        ))
        )}
      </div>
    </div>
  );
}
