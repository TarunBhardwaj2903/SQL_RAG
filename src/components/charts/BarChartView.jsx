import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
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
        <p key={i} style={{ color: p.fill }} className="tabular-nums">
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function BarChartView({ chartSpec }) {
  const { data_transformed, series = [], x_axis, y_axis, title } = chartSpec;
  if (!data_transformed?.length || !series.length) return null;

  const s = series[0];
  const color = getSeriesColor(s.color_index);

  return (
    <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4"
         aria-label={title}>
      <p className="text-xs font-semibold text-slate-400 mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data_transformed} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="__x"
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            interval={0}
            label={x_axis?.label ? { value: x_axis.label, position: 'insideBottom', offset: -30,
                     fill: CHART_TEXT_COLOR, fontSize: 11 } : undefined}
          />
          <YAxis
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
            tickFormatter={v => y_axis?.unit === '$' ? `$${(v / 1000).toFixed(0)}K` : v.toLocaleString()}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
          <Bar dataKey={s.data_key} name={s.name} radius={[4, 4, 0, 0]}>
            {data_transformed.map((_, i) => (
              <Cell key={i} fill={color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
