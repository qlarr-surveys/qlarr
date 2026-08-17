import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import NPSChart from '../charts/NPSChart';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { transformNPSData } from '~/analytics/utils/dataTransformers';

export default function NPSVisualization({ question }) {
  const data = useMemo(() => transformNPSData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const getNPSBenchmarkLabel = (score) => {
    if (score >= 70) return t('analytics.excellent');
    if (score >= 30) return t('analytics.great');
    if (score >= 0) return t('analytics.good');
    return t('analytics.needs_improvement');
  };

  const stats = [
    {
      label: t('analytics.nps_score'),
      value: data.score,
      description: getNPSBenchmarkLabel(data.score),
    },
    {
      label: t('analytics.promoters'),
      value: `${data.promoterPct}%`,
      description: t('analytics.responses_count', { count: data.promoters }),
    },
    {
      label: t('analytics.passives'),
      value: `${data.passivePct}%`,
      description: t('analytics.responses_count', { count: data.passives }),
    },
    {
      label: t('analytics.detractors'),
      value: `${data.detractorPct}%`,
      description: t('analytics.responses_count', { count: data.detractors }),
    },
  ];

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={4} />
        <NPSChart
          score={data.score}
          categoryData={data.categoryData}
          distributionData={data.distributionData}
        />
      </Box>
    </ChartContainer>
  );
}
