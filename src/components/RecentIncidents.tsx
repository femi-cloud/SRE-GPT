import { History, Download } from 'lucide-react';
import { IncidentReport } from '../types';

interface RecentIncidentsProps {
  incidents: IncidentReport[];
}

export function RecentIncidents({ incidents }: RecentIncidentsProps) {
  if (incidents.length === 0) return null;

  const handleDownloadSingle = (incident: IncidentReport) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incident, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `incident_${incident.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          <History size={20} />
        </div>
        <h2 className="text-[17px] font-bold text-gray-800 dark:text-gray-100">Recent Incidents</h2>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {incidents.map(inc => (
          <div key={inc.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 shadow-sm">
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
        ))}
      </div>
    </div>
  );
}
