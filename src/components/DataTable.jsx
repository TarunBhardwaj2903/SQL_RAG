import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Download, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 8;

function exportCSV(columns, rows, filename = 'export.csv') {
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines  = [columns.map(escape).join(',')];
  rows.forEach(r => lines.push(r.map(escape).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function SortIcon({ dir }) {
  if (dir === 'asc')  return <ChevronUp size={12} className="text-indigo-400" />;
  if (dir === 'desc') return <ChevronDown size={12} className="text-indigo-400" />;
  return <ChevronsUpDown size={12} className="text-slate-600" />;
}

export default function DataTable({ columns, rows, queryLabel = 'data' }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filter,  setFilter]  = useState('');
  const [page,    setPage]    = useState(1);

  // Filter
  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const lf = filter.toLowerCase();
    return rows.filter(r => r.some(cell => String(cell).toLowerCase().includes(lf)));
  }, [rows, filter]);

  // Sort
  const sorted = useMemo(() => {
    if (sortCol === null) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortCol]; const vb = b[sortCol];
      const na = parseFloat(String(va).replace(/[$,%]/g, ''));
      const nb = parseFloat(String(vb).replace(/[$,%]/g, ''));
      const cmp = isNaN(na) || isNaN(nb)
        ? String(va).localeCompare(String(vb))
        : na - nb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = useCallback(idx => {
    if (sortCol === idx) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(idx); setSortDir('asc'); }
  }, [sortCol]);

  // Color-coding helper for values
  function cellClass(value) {
    const s = String(value);
    const n = parseFloat(s.replace(/[$,%]/g, ''));
    if (s.endsWith('%')) {
      if (n >= 70)  return 'text-emerald-400 font-semibold';
      if (n >= 40)  return 'text-yellow-400';
      if (n > 0)    return 'text-red-400';
    }
    if (s.startsWith('$')) return 'text-cyan-300';
    return 'text-slate-200';
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-700/60 overflow-hidden animate-slide-in">
      {/* Table toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-800/70 border-b border-slate-700/60">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="table-search"
            type="text"
            placeholder="Filter results…"
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(1); }}
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg
                       bg-slate-900 border border-slate-700 text-slate-300
                       placeholder-slate-600 transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {sorted.length} row{sorted.length !== 1 ? 's' : ''}
          </span>
          <button
            id="export-csv-btn"
            onClick={() => exportCSV(columns, sorted, `${queryLabel.replace(/\s+/g,'-').toLowerCase()}.csv`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30
                       text-indigo-300 transition-all cursor-pointer"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/60 bg-slate-900/60">
              {columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className="px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider
                             cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-nowrap"
                >
                  <span className="flex items-center gap-1.5">
                    {col}
                    <SortIcon dir={sortCol === i ? sortDir : null} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-600">
                  No results match your filter.
                </td>
              </tr>
            ) : pageRows.map((row, ri) => (
              <tr
                key={ri}
                className="table-row-hover border-b border-slate-800/60 transition-colors"
              >
                {row.map((cell, ci) => (
                  <td key={ci} className={`px-4 py-3 ${cellClass(cell)}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/40 border-t border-slate-700/60">
          <span className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              id="prev-page-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md bg-slate-800 border border-slate-700
                         text-slate-400 hover:text-slate-200 disabled:opacity-30
                         disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              id="next-page-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md bg-slate-800 border border-slate-700
                         text-slate-400 hover:text-slate-200 disabled:opacity-30
                         disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
