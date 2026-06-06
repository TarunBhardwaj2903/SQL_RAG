import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  CHART_TOOLTIP_BG, CHART_TOOLTIP_BORDER,
  CHART_AXIS_COLOR, ACCESSIBLE_PALETTE,
} from './chartTheme';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{ background: CHART_TOOLTIP_BG, border: `1px solid ${CHART_TOOLTIP_BORDER}` }}
         className="rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold">{name}</p>
      <p className="text-white tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
};

export default function PieChartView({ chartSpec }) {
  const { data_transformed, chart_type, title, data_truncated } = chartSpec;
  if (!data_transformed?.length) return null;

  const isDonut = chart_type === 'donut';

  return (
    <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4"
         aria-label={title}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400">{title}</p>
        {data_truncated && (
          <span className="text-[10px] text-slate-500 italic">Top 5 shown + Other</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data_transformed}
            dataKey="__value"
            nameKey="__name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={isDonut ? 48 : 0}
            paddingAngle={2}
            label={({ __name, percent }) =>
              percent > 0.05 ? `${(__name || '').slice(0, 14)}` : ''
            }
            labelLine={false}
          >
            {data_transformed.map((_, i) => (
              <Cell key={i} fill={ACCESSIBLE_PALETTE[i % ACCESSIBLE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: CHART_AXIS_COLOR }}
            formatter={val => val?.slice(0, 20)}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
