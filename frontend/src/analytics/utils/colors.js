// Chart color palettes for survey visualizations

const CHART_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

export const STATUS_COLORS = {
  incomplete: '#4b5563', // dark gray
  preview: '#6b7280',   // medium gray
};

export const NPS_COLORS = {
  detractor: '#ef4444', // red (0-6)
  passive: '#f59e0b',   // amber (7-8)
  promoter: '#22c55e',  // green (9-10)
};

export const NPS_BENCHMARK_COLORS = {
  needsImprovement: '#ef4444', // red (-100 to 0)
  good: '#f59e0b',             // amber (0 to 30)
  great: '#22c55e',            // green (30 to 70)
  excellent: '#15803d',        // dark green (70 to 100)
};

const HEATMAP_COLORS = {
  low: '#dbeafe',    // light blue
  medium: '#60a5fa', // medium blue
  high: '#1d4ed8',   // dark blue
};

// Get color by index with cycling
export const getChartColor = (index) => CHART_COLORS[index % CHART_COLORS.length];

// Generate gradient colors between two colors
const interpolateColor = (color1, color2, factor) => {
  const hex = (c) => parseInt(c, 16);
  const r1 = hex(color1.slice(1, 3));
  const g1 = hex(color1.slice(3, 5));
  const b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3));
  const g2 = hex(color2.slice(3, 5));
  const b2 = hex(color2.slice(5, 7));

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Get heatmap color based on value (0-1)
export const getHeatmapColor = (value, minColor = HEATMAP_COLORS.low, maxColor = HEATMAP_COLORS.high) => {
  return interpolateColor(minColor, maxColor, value);
};
