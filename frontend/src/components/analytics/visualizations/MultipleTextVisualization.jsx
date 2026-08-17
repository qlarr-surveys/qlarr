import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { buildBaseStats } from '../common/buildBaseStats';
import DataTable from '../common/DataTable';
import NoResponsesMessage from '../common/NoResponsesMessage';
import { transformMultipleTextData } from '~/analytics/utils/dataTransformers';

export default function MultipleTextVisualization({ question }) {
  const { fields = [], responses = [] } = question;
  const { t } = useTranslation(NAMESPACES.MANAGE);

  if (responses.length === 0) {
    return <NoResponsesMessage />;
  }

  const data = useMemo(() => transformMultipleTextData(question), [question]);

  const avgCompletion = data.fieldStats.length > 0
    ? Math.round(data.fieldStats.reduce((sum, f) => sum + f.completionRate, 0) / data.fieldStats.length)
    : 0;

  const stats = [
    ...buildBaseStats(data, t),
    { label: t('analytics.stat_fields'), value: fields.length },
    { label: t('analytics.stat_avg_completion'), value: `${avgCompletion}%` },
  ];

  const columns = fields.map((field) => ({
    key: field.label,
    label: field.label,
    sortable: true,
  }));

  const tableData = responses.map((r) => {
    const row = {};
    fields.forEach((field) => {
      row[field.label] = r[field.code] || '-';
    });
    return row;
  });

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={3} />
        <DataTable
          data={tableData}
          columns={columns}
          searchable
          paginated
          rowsPerPage={10}
          emptyMessage={t('analytics.no_responses_yet')}
        />
      </Box>
    </ChartContainer>
  );
}
