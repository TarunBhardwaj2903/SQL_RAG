/**
 * Chart Theme — IBM Carbon Accessible Palette
 *
 * Distinguishable under protanopia, deuteranopia, and tritanopia.
 * Used by all chart components via color_index from the backend ChartSpec.
 *
 * These are static hex values intentionally — Recharts SVG fill/stroke
 * attributes require resolved hex, not CSS custom property references.
 * To change the theme, update this file only.
 */

export const ACCESSIBLE_PALETTE = [
  '#0f62fe', // Blue    — series 0
  '#ff832b', // Orange  — series 1
  '#009d9a', // Teal    — series 2
  '#da1e28', // Red     — series 3
  '#8a3ffc', // Purple  — series 4
  '#f1c21b', // Yellow  — series 5
];

/** Grid and axis colors that match the existing slate dark theme */
export const CHART_GRID_COLOR    = '#334155'; // slate-700
export const CHART_AXIS_COLOR    = '#64748b'; // slate-500
export const CHART_TOOLTIP_BG    = '#1e293b'; // slate-800
export const CHART_TOOLTIP_BORDER = '#475569'; // slate-600
export const CHART_TEXT_COLOR    = '#94a3b8'; // slate-400

/** Returns the hex color for a given series color_index (wraps if > 5). */
export function getSeriesColor(colorIndex) {
  return ACCESSIBLE_PALETTE[colorIndex % ACCESSIBLE_PALETTE.length];
}
