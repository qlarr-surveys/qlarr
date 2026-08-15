import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import HorizontalBarChart from '../charts/HorizontalBarChart';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import FrequencyTable from '../common/FrequencyTable';
import { transformBarcodeData } from '~/analytics/utils/dataTransformers';

export default function BarcodeVisualization({ question }) {
  const data = useMemo(() => transformBarcodeData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const stats = [
    { label: t('analytics.stat_scanned'), value: data.answered },
    { label: t('analytics.stat_unique_codes'), value: data.uniqueCount },
  ];

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={2} />
        {data.barData.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {t('analytics.top_scanned_codes')}
            </Typography>
            <HorizontalBarChart data={data.barData.slice(0, 10)} height={Math.max(250, data.barData.slice(0, 10).length * 40)} />
          </>
        )}
        {data.frequencyData.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {t('analytics.all_scanned_codes')}
            </Typography>
            <FrequencyTable
              data={data.frequencyData}
              valueLabel={t('analytics.col_barcode')}
              countLabel={t('analytics.col_scans')}
            />
          </>
        )}
      </Box>
    </ChartContainer>
  );
}
