import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import ChartContainer from '../common/ChartContainer';
import FrequencyTable from '../common/FrequencyTable';
import { StatsRow } from '../common/StatCard';
import { transformFileUploadData } from '~/analytics/utils/dataTransformers';

export default function FileUploadVisualization({ question }) {
  const data = useMemo(() => transformFileUploadData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const stats = [
    { label: t('analytics.stat_uploaded'), value: data.answered },
  ];

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={1} />
        <FrequencyTable data={data.extensionData} valueLabel={t('analytics.col_extension')} countLabel={t('analytics.col_count')} />
      </Box>
    </ChartContainer>
  );
}
