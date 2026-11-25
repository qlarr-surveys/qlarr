// Chart color palettes for survey visualizations

// Led by the phase-3.3 prototype's blue, green and orange. Its red comes
// fifth, with violet between it and the orange, which it sits too close to
// as a neighbour; its slate is left out, as it reads as "no data" gray. In
// this order every neighbouring pair passes the dataviz palette validator's
// colour-blind, normal-vision and 3:1 contrast checks on white.
const CHART_COLORS = [
  '#3a46d8', // blue
  '#0e8a6b', // green
  '#c2680a', // orange
  '#6250d6', // violet
  '#b3261e', // red
  '#0f7ea8', // teal
  '#c2417a', // magenta
  '#6b7d00', // olive
];

export const STATUS_COLORS = {
  incomplete: '#4b5563', // dark gray
  preview: '#6b7280',   // medium gray
};

// As the phase-3.3 NPS card draws them: passives recede to gray, so the eye
// lands on the two ends.
export const NPS_COLORS = {
  detractor: '#d9534f', // red (0-6)
  passive: '#c9cde0',   // gray (7-8)
  promoter: '#0e8a6b',  // green (9-10)
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
