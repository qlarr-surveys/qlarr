import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import DataTable from '../common/DataTable';
import { transformNumberData } from '~/analytics/utils/dataTransformers';
import { formatNumber } from '~/analytics/utils/formatting';

export default function NumberVisualization({ question }) {
  const data = useMemo(() => transformNumberData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const hasOutliers = data.outlierData.outliersCount > 0;

  // Build table data from backend frequency table
  const tableData = useMemo(() => {
    return (data.frequencyTable || []).map((item) => ({
      rawValue: item.value,
      value: formatNumber(item.value, { context: 'full', decimals: 2 }),
      frequency: item.count,
      percentage: data.stats.count > 0 ? `${((item.count / data.stats.count) * 100).toFixed(1)}%` : '0.0%',
    }));
  }, [data.frequencyTable, data.stats.count]);

  // Define columns
  const columns = [
    { key: 'value', label: t('analytics.col_value'), sortable: true, align: 'right' },
    { key: 'frequency', label: t('analytics.col_frequency'), sortable: true, align: 'right' },
    { key: 'percentage', label: t('analytics.col_percentage'), sortable: true, align: 'right' },
  ];

  // Highlight outliers
  const highlightRow = (row) => data.outlierData.outliers.includes(row.rawValue);

  // Primary stats
  const stats = [
    {
      label: t('analytics.stat_responses'),
      value: `${data.answered} / ${data.total}`,
    },
    {
      label: t('analytics.stat_mean'),
      value: formatNumber(data.stats.mean, { context: 'full', decimals: 2 }),
    },
    {
      label: t('analytics.stat_median'),
      value: formatNumber(data.stats.median, { context: 'full', decimals: 2 }),
    },
    {
      label: t('analytics.stat_range'),
      value: `${formatNumber(data.stats.min, { context: 'full', decimals: 2 })} - ${formatNumber(
        data.stats.max,
        { context: 'full', decimals: 2 }
      )}`,
    },
  ];

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Stats Row */}
        <StatsRow stats={stats} columns={4} />

        {/* Outlier Summary */}
        {hasOutliers && (
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'warning.light',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'warning.main',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {data.outlierData.outliersCount > 1
                ? t('analytics.outlier_message_other', { count: data.outlierData.outliersCount })
                : t('analytics.outlier_message_one', { count: data.outlierData.outliersCount })}
            </Typography>
          </Box>
        )}

        {/* Data Table */}
        <DataTable
          data={tableData}
          columns={columns}
          searchable={true}
          paginated={true}
          rowsPerPage={20}
          highlightRow={highlightRow}
          emptyMessage={t('analytics.no_numeric_data')}
        />
      </Box>
    </ChartContainer>
  );
}
