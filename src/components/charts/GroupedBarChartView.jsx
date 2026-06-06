import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  CHART_GRID_COLOR, CHART_AXIS_COLOR,
  CHART_TOOLTIP_BG, CHART_TOOLTIP_BORDER,
  CHART_TEXT_COLOR, getSeriesColor,
} from './chartTheme';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: CHART_TOOLTIP_BG, border: `1px solid ${CHART_TOOLTIP_BORDER}` }}
         className="rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill ?? p.color }} className="tabular-nums">
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function GroupedBarChartView({ chartSpec }) {
  const { data_transformed, series = [], x_axis, y_axis, title, dual_y_axis, data_truncated, meta } = chartSpec;
  if (!data_transformed?.length || !series.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4"
         aria-label={title}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400">{title}</p>
        {data_truncated && (
          <span className="text-[10px] text-slate-500 italic">
            Showing top {meta?.row_count_rendered} of {meta?.row_count_original}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data_transformed} margin={{ top: 4, right: dual_y_axis ? 48 : 16, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="__x"
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 10 }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          {/* Primary Y-axis (left) */}
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
            tickFormatter={v => y_axis?.unit === '$' ? `$${(v / 1000).toFixed(0)}K` : v.toLocaleString()}
            width={60}
          />
          {/* Secondary Y-axis (right) — only shown when dual_y_axis is true */}
          {dual_y_axis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
              tickFormatter={v => v.toLocaleString()}
              width={50}
            />
          )}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: CHART_AXIS_COLOR, paddingTop: 8 }} />
          {series.map(s => (
            <Bar
              key={s.data_key}
              dataKey={s.data_key}
              name={s.name}
              fill={getSeriesColor(s.color_index)}
              fillOpacity={0.85}
              radius={[3, 3, 0, 0]}
              yAxisId={dual_y_axis ? s.y_axis_id : 'left'}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
