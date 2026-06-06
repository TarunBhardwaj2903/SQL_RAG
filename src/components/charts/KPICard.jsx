import React from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * Renders kpi_card (single metric) and kpi_multi (2-6 metrics).
 * Large tile format appropriate for C-suite dashboards.
 */
export default function KPICard({ chartSpec }) {
  const { kpi_values = [], title, chart_type } = chartSpec;

  if (!kpi_values.length) return null;

  // Single KPI
  if (chart_type === 'kpi_card') {
    const kpi = kpi_values[0];
    return (
      <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-6"
           role="figure"
           aria-label={`${title}: ${kpi.unit ?? ''}${kpi.value}`}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            {kpi.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          {kpi.unit && (
            <span className="text-2xl font-bold text-slate-300">{kpi.unit}</span>
          )}
          <span className="text-5xl font-bold text-white tabular-nums">
            {formatValue(kpi.value)}
          </span>
        </div>
      </div>
    );
  }

  // Multi KPI
  return (
    <div className="mt-4 grid gap-3"
         style={{ gridTemplateColumns: `repeat(${Math.min(kpi_values.length, 3)}, 1fr)` }}
         role="figure"
         aria-label={title}>
      {kpi_values.map((kpi, i) => (
        <div key={i}
             className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 truncate">
            {kpi.label}
          </div>
          <div className="flex items-baseline gap-1">
            {kpi.unit && (
              <span className="text-sm font-bold text-slate-400">{kpi.unit}</span>
            )}
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatValue(kpi.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Format large numbers compactly for executive readability. */
function formatValue(val) {
  if (val === null || val === undefined) return '—';
  const n = parseFloat(String(val).replace(/[$,%]/g, '').replace(/,/g, ''));
  if (isNaN(n)) return String(val);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n % 1 === 0 ? n.toLocaleString() : n.toFixed(2);
}
