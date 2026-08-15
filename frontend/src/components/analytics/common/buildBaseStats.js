// Returns the base stats entries common to most visualizations.
export const buildBaseStats = (data, t) => [
  { label: t('analytics.stat_answered'), value: data.answered },
  ...(data.incomplete > 0 ? [{ label: t('analytics.stat_incomplete'), value: data.incomplete }] : []),
  ...(data.preview > 0 ? [{ label: t('analytics.stat_preview'), value: data.preview }] : []),
];
