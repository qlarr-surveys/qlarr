// Turns a transformer's `topChoice` ({ topLabels, topCount, tied }) into a StatCard
// { value, description }. When options are tied, lists the tied labels (capped at
// `maxLabels`, with a "+N more" suffix) and adds a small "Tied" caption.
export const formatTopChoice = (topChoice, t, { maxLabels = 2 } = {}) => {
  const labels = topChoice?.topLabels ?? [];
  if (labels.length === 0) return { value: '-', description: '' };
  if (labels.length === 1) return { value: labels[0], description: '' };

  const shown = labels.slice(0, maxLabels);
  const remaining = labels.length - shown.length;
  let value = shown.join(t('analytics.tie_separator'));
  if (remaining > 0) value += ' ' + t('analytics.tie_more', { count: remaining });

  return { value, description: t('analytics.tie_caption') };
};
