import React, { useState, lazy, Suspense } from 'react';
import { Sparkles, BarChart2 } from 'lucide-react';
import DataTable from '../DataTable';
import ChartToggleBar from '../charts/ChartToggleBar';
import ChartVirtualizer from '../charts/ChartVirtualizer';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartSkeleton from '../charts/ChartSkeleton';

const ChartRouter = lazy(() => import('../charts/ChartRouter'));

function renderSummary(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-slate-300 leading-relaxed text-sm mb-1.5 last:mb-0">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
            : part
        )}
      </p>
    );
  });
}

function extractTableData(chartSpec) {
  if (!chartSpec || !chartSpec.data_transformed?.length) {
    return { columns: [], rows: [] };
  }

  const { chart_type, data_transformed, x_axis, y_axis, series } = chartSpec;

  if (chart_type === 'pie' || chart_type === 'donut') {
    const cols = ['Item', 'Value'];
    const rows = data_transformed.map(item => [item.__name, item.__value]);
    return { columns: cols, rows };
  }

  const xLabel = x_axis?.label || x_axis?.column || 'Category';
  const seriesItems = series || [];

  if (seriesItems.length > 0) {
    const cols = [xLabel, ...seriesItems.map(s => s.name || s.column)];
    const rows = data_transformed.map(item => {
      const xVal = item.__x;
      const yVals = seriesItems.map(s => item[s.data_key] ?? null);
      return [xVal, ...yVals];
    });
    return { columns: cols, rows };
  }

  const keys = Object.keys(data_transformed[0]);
  const cols = keys.map(k => k.replace(/^__/, ''));
  const rows = data_transformed.map(item => keys.map(k => item[k]));
  return { columns: cols, rows };
}

export default function AnalysisResultCard({ result, prompt }) {
  const [viewMode, setViewMode] = useState('chart');

  if (!result) return null;

  const { chart_spec, insight } = result;
  const hasChart = chart_spec &&
                   chart_spec.chart_type !== 'table' &&
                   chart_spec.chart_type !== 'empty_state';
  const isEmptyState = chart_spec?.chart_type === 'empty_state';

  const tableData = extractTableData(chart_spec);
  const showTable = !hasChart || viewMode === 'table';
  const hasTableData = tableData.columns.length > 0;

  const dataTableEl = hasTableData ? (
    <DataTable
      columns={tableData.columns}
      rows={tableData.rows}
      queryLabel={prompt?.slice(0, 30) || 'analysis_results'}
    />
  ) : null;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 animate-slide-in">
      {/* Insight Executive Summary Card */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40 bg-indigo-500/5">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">Executive Insight</span>
          </div>
          {result.rows_analyzed && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {result.rows_analyzed.toLocaleString()} rows analyzed
            </span>
          )}
        </div>
        <div className="px-5 py-4">
          {renderSummary(insight)}
        </div>
      </div>

      {/* Chart Toggle Bar */}
      {hasChart && (
        <ChartToggleBar viewMode={viewMode} onChange={setViewMode} />
      )}

      {/* Chart View */}
      {hasChart && viewMode === 'chart' && (
        <ChartVirtualizer>
          <ChartErrorBoundary fallbackElement={dataTableEl}>
            <Suspense fallback={<ChartSkeleton />}>
              <ChartRouter chartSpec={chart_spec} />
            </Suspense>
          </ChartErrorBoundary>
        </ChartVirtualizer>
      )}

      {/* Empty State */}
      {isEmptyState && (
        <Suspense fallback={<ChartSkeleton />}>
          <ChartRouter chartSpec={chart_spec} />
        </Suspense>
      )}

      {/* Data Table View label */}
      {!hasChart && !isEmptyState && hasTableData && (
        <div className="flex items-center gap-1.5 mt-2 mb-1">
          <BarChart2 size={11} className="text-slate-500" />
          <span className="text-xs text-slate-500">Data table view</span>
        </div>
      )}

      {/* Data Table */}
      {showTable && dataTableEl}
    </div>
  );
}
