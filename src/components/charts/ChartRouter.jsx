import React from 'react';
import BarChartView         from './BarChartView';
import LineChartView        from './LineChartView';
import PieChartView         from './PieChartView';
import GroupedBarChartView  from './GroupedBarChartView';
import ScatterChartView     from './ScatterChartView';
import KPICard              from './KPICard';

/**
 * ChartRouter — reads chart_spec.chart_type and renders the correct component.
 *
 * This file is the React.lazy() boundary — Recharts only loads when a chart
 * result arrives (not at initial page load).
 *
 * Returns null for:
 *   - null / undefined chartSpec
 *   - chart_type === "table"   → DataTable renders instead (unchanged behaviour)
 *   - chart_type === "empty_state" → handled by parent (AssistantMessage)
 */
export default function ChartRouter({ chartSpec }) {
  if (!chartSpec) return null;

  const { chart_type } = chartSpec;

  switch (chart_type) {
    case 'bar':
      return <BarChartView chartSpec={chartSpec} />;

    case 'line':
      return <LineChartView chartSpec={chartSpec} />;

    case 'pie':
    case 'donut':
      return <PieChartView chartSpec={chartSpec} />;

    case 'grouped_bar':
      return <GroupedBarChartView chartSpec={chartSpec} />;

    case 'scatter':
      return <ScatterChartView chartSpec={chartSpec} />;

    case 'kpi_card':
    case 'kpi_multi':
      return <KPICard chartSpec={chartSpec} />;

    case 'empty_state':
      return <EmptyStateView title={chartSpec.title} />;

    case 'table':
    default:
      return null; // DataTable renders as normal
  }
}

/** Inline empty-state illustration — no chart, no table, no data returned. */
function EmptyStateView({ title }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-800/20 py-10 px-6
                    flex flex-col items-center text-center gap-3">
      <div className="text-3xl opacity-30">📭</div>
      <p className="text-sm font-semibold text-slate-400">No data returned</p>
      <p className="text-xs text-slate-600 max-w-xs">
        The query ran successfully but returned 0 rows.
        Try adjusting the filters or date range.
      </p>
    </div>
  );
}
