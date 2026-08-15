import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import CompletionCard from '../charts/CompletionCard';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { transformMediaCaptureData } from '~/analytics/utils/dataTransformers';

export default function MediaCaptureVisualization({ question }) {
  const data = useMemo(() => transformMediaCaptureData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const stats = [
    { label: t('analytics.stat_captured'), value: data.captured },
    { label: t('analytics.stat_not_captured'), value: data.notCaptured },
    { label: t('analytics.completion_rate'), value: `${data.completionRate}%` },
  ];

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={3} />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CompletionCard
            rate={data.completionRate}
            completed={data.captured}
            total={data.total}
            label={t('analytics.photos_captured')}
            color="auto"
            size="large"
          />
        </Box>
      </Box>
    </ChartContainer>
  );
}
