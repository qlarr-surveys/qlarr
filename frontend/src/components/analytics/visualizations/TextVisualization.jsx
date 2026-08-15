import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { buildBaseStats } from '../common/buildBaseStats';
import FrequencyTable from '../common/FrequencyTable';
import { transformTextData } from '~/analytics/utils/dataTransformers';

export default function TextVisualization({ question }) {
  const data = useMemo(() => transformTextData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const stats = [
    ...buildBaseStats(data, t),
    { label: t('analytics.unique_responses'), value: data.uniqueCount },
    { label: t('analytics.avg_length'), value: t('analytics.chars', { length: data.avgLength }) },
  ];

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={3} />
        <FrequencyTable
          data={data.frequencyData}
          valueLabel={t('analytics.col_response')}
          countLabel={t('analytics.col_count')}
        />
      </Box>
    </ChartContainer>
  );
}
