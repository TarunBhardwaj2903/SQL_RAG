import React from 'react';
import { BarChart2, Table } from 'lucide-react';

/**
 * Single-click toggle strip for C-suite users.
 * Lets them switch between the auto-selected chart and raw table view.
 *
 * Props:
 *   viewMode  : 'chart' | 'table'
 *   onChange  : (mode) => void
 */
export default function ChartToggleBar({ viewMode, onChange }) {
  return (
    <div className="flex items-center gap-1 mt-3 mb-1">
      <button
        onClick={() => onChange('chart')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all cursor-pointer
                    ${viewMode === 'chart'
                      ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-800/60 border border-slate-700 text-slate-500 hover:text-slate-300'
                    }`}
      >
        <BarChart2 size={12} />
        Chart
      </button>
      <button
        onClick={() => onChange('table')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all cursor-pointer
                    ${viewMode === 'table'
                      ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-800/60 border border-slate-700 text-slate-500 hover:text-slate-300'
                    }`}
      >
        <Table size={12} />
        Table
      </button>
    </div>
  );
}
