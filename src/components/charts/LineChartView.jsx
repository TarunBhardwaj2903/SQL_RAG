import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
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
        <p key={i} style={{ color: p.color }} className="tabular-nums">
          {p.name}: <strong>{p.value == null ? '—' : (typeof p.value === 'number' ? p.value.toLocaleString() : p.value)}</strong>
        </p>
      ))}
    </div>
  );
};

export default function LineChartView({ chartSpec }) {
  const { data_transformed, series = [], x_axis, y_axis, title, meta } = chartSpec;
  if (!data_transformed?.length || !series.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4"
         aria-label={title}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400">{title}</p>
        {meta?.gap_fill_applied && (
          <span className="text-[10px] text-slate-600 italic">Gaps shown where no data exists</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data_transformed} margin={{ top: 4, right: 16, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="__x"
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
            label={x_axis?.label ? { value: x_axis.label, position: 'insideBottom', offset: -12,
                     fill: CHART_TEXT_COLOR, fontSize: 11 } : undefined}
          />
          <YAxis
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
            tickFormatter={v => v == null ? '' : (y_axis?.unit === '$' ? `$${(v / 1000).toFixed(0)}K` : v.toLocaleString())}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          {series.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: CHART_AXIS_COLOR, paddingTop: 8 }}
            />
          )}
          {series.map(s => (
            <Line
              key={s.data_key}
              type="monotone"
              dataKey={s.data_key}
              name={s.name}
              stroke={getSeriesColor(s.color_index)}
              strokeWidth={2}
              dot={false}
              connectNulls={false}   // null = visible gap in line (Scenario C fix)
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
