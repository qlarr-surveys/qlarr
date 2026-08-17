import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import RankingChart from '../charts/RankingChart';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { buildBaseStats } from '../common/buildBaseStats';
import { RankedImageGallery } from '../common/ImageGallery';
import { transformImageRankingData } from '~/analytics/utils/dataTransformers';

export default function ImageRankingVisualization({ question }) {
  const data = useMemo(() => transformImageRankingData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const topItem = data.rankedImages[0];
  const bottomItem = data.rankedImages[data.rankedImages.length - 1];

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
        <StatsRow stats={stats} columns={3} />
        <RankedImageGallery images={data.rankedImages} showAverageRank={true} />
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          {t('analytics.ranking_note')}
        </Typography>
      </Box>
    </ChartContainer>
  );
}
