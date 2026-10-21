import React, { useState } from 'react';
import { Table, Eye, FileSpreadsheet, RefreshCw } from 'lucide-react';

function getDtypeBadgeClass(dtypeStr) {
  const d = String(dtypeStr).toLowerCase();
  if (d.includes('int') || d.includes('float') || d.includes('num')) {
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  }
  if (d.includes('date') || d.includes('time')) {
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }
  return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
}

export default function SchemaPreview({ sessionData, onReset }) {
  const [showSample, setShowSample] = useState(false);
  const { filename, row_count, columns, dtypes, sample_rows } = sessionData;

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">{filename}</h4>
            <p className="text-xs text-slate-400">
              {row_count.toLocaleString()} rows · {columns.length} columns
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSample(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            <Eye size={13} />
            {showSample ? 'Hide Sample' : 'View Sample Data'}
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            title="Upload a different file"
          >
            <RefreshCw size={13} />
            Change File
          </button>
        </div>
      </div>

      {/* Schema / Dtype Badges Grid */}
      <div className="pt-4">
        <p className="text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
          Detected Schema Columns
        </p>
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
          {columns.map((col) => (
            <div
              key={col}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs"
            >
              <span className="font-medium text-slate-300">{col}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${getDtypeBadgeClass(dtypes[col])}`}>
                {dtypes[col]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sample Data Table Modal/Expand */}
      {showSample && sample_rows?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Table size={13} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-400">Sample Rows (First 5)</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-48">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-2 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sample_rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    {row.map((val, cellIdx) => (
                      <td key={cellIdx} className="px-3 py-1.5 whitespace-nowrap text-slate-300">
                        {val === null ? <span className="text-slate-600 italic">null</span> : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
