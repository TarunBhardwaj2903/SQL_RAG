import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  CHART_GRID_COLOR, CHART_AXIS_COLOR,
  CHART_TOOLTIP_BG, CHART_TOOLTIP_BORDER,
  getSeriesColor,
} from './chartTheme';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload ?? {};
  return (
    <div style={{ background: CHART_TOOLTIP_BG, border: `1px solid ${CHART_TOOLTIP_BORDER}` }}
         className="rounded-lg px-3 py-2 text-xs shadow-xl">
      {d.__label && <p className="text-slate-300 font-semibold mb-1">{d.__label}</p>}
      <p className="text-white tabular-nums">X: {d.__x?.toLocaleString()}</p>
      <p className="text-white tabular-nums">Y: {d.__y?.toLocaleString()}</p>
    </div>
  );
};

export default function ScatterChartView({ chartSpec }) {
  const { data_transformed, series = [], x_axis, y_axis, title, data_truncated, meta } = chartSpec;
  if (!data_transformed?.length) return null;

  const color = getSeriesColor(series[0]?.color_index ?? 0);

  return (
    <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4"
         aria-label={title}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400">{title}</p>
        {data_truncated && (
          <span className="text-[10px] text-slate-500 italic">
            Showing {meta?.row_count_rendered} of {meta?.row_count_original} points
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 4, right: 16, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis
            dataKey="__x"
            type="number"
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
            name={x_axis?.label ?? 'X'}
          />
          <YAxis
            dataKey="__y"
            type="number"
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
            name={y_axis?.labels?.[0] ?? 'Y'}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data_transformed} fill={color} fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
