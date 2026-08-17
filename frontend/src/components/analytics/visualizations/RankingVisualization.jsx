import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import RankingChart from '../charts/RankingChart';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { buildBaseStats } from '../common/buildBaseStats';
import { transformRankingData } from '~/analytics/utils/dataTransformers';

export default function RankingVisualization({ question }) {
  const data = useMemo(() => transformRankingData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const topItem = data.averageRankData[0];
  const bottomItem = data.averageRankData[data.averageRankData.length - 1];

  const stats = [
    ...buildBaseStats(data, t),
    {
      label: t('analytics.most_preferred'),
      value: topItem?.name || '-',
      description: t('analytics.avg_rank_colon', { rank: topItem?.averageRank }),
    },
    {
      label: t('analytics.least_preferred'),
      value: bottomItem?.name || '-',
      description: t('analytics.avg_rank_colon', { rank: bottomItem?.averageRank }),
    },
  ];

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Stats Row */}
        <StatsRow stats={stats} />

        {/* Ranking Chart */}
        <RankingChart data={data.averageRankData} height={350} showFirstLast={true} />

        {/* Note */}
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          {t('analytics.ranking_note')}
        </Typography>
      </Box>
    </ChartContainer>
  );
}
