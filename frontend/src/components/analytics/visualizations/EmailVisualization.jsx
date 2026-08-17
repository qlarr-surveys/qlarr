import { useMemo } from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import PieDonutChart from '../charts/PieDonutChart';
import HorizontalBarChart from '../charts/HorizontalBarChart';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { buildBaseStats } from '../common/buildBaseStats';
import DataTable from '../common/DataTable';
import { transformEmailData } from '~/analytics/utils/dataTransformers';

export default function EmailVisualization({ question }) {
  const data = useMemo(() => transformEmailData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const stats = [
    ...buildBaseStats(data, t),
    { label: t('analytics.stat_unique_domains'), value: data.uniqueDomains },
    {
      label: t('analytics.stat_top_domain'),
      value: data.domainData[0]?.name || '-',
      description: t('analytics.emails_count', { count: data.domainData[0]?.count || 0 }),
    },
  ];

  // Email list table
  const emailColumns = [
    { key: 'index', label: '#', sortable: true, align: 'right' },
    { key: 'email', label: t('analytics.col_email'), sortable: true },
    { key: 'domain', label: t('analytics.col_domain'), sortable: true },
  ];

  const highlightDuplicate = (row) => row.isDuplicate;

  // Domain table
  const domainColumns = [
    { key: 'domain', label: t('analytics.col_domain'), sortable: true },
    { key: 'count', label: t('analytics.col_count'), sortable: true, align: 'right' },
    { key: 'percentage', label: t('analytics.col_percentage'), sortable: true, align: 'right' },
  ];

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Stats Row */}
        <StatsRow stats={stats} columns={4} />

        {/* Charts Side by Side */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary', mb: 1.5 }}>
              {t('analytics.domain_distribution')}
            </Typography>
            <PieDonutChart
              data={data.domainData.slice(0, 6).map((d) => ({ ...d, value: d.count }))}
              height={280}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary', mb: 1.5 }}>
              {t('analytics.top_domains')}
            </Typography>
            <HorizontalBarChart data={data.domainData.slice(0, 8)} height={280} />
          </Grid>
        </Grid>

        {/* All Emails Table */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary', mb: 1.5 }}>
            {t('analytics.all_emails')}
          </Typography>
          {data.duplicateCount > 0 && (
            <Box
              sx={{
                p: 1.5,
                mb: 2,
                bgcolor: 'warning.light',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'warning.main',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {data.duplicateCount > 1 ? t('analytics.duplicate_email_message_other', { count: data.duplicateCount }) : t('analytics.duplicate_email_message_one', { count: data.duplicateCount })}
              </Typography>
            </Box>
          )}
          <DataTable
            data={data.emailList}
            columns={emailColumns}
            searchable={true}
            paginated={true}
            rowsPerPage={20}
            highlightRow={highlightDuplicate}
            emptyMessage={t('analytics.no_email_data')}
          />
        </Box>

        {/* Domains Table */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary', mb: 1.5 }}>
            {t('analytics.domains')}
          </Typography>
          <DataTable
            data={data.allDomainData}
            columns={domainColumns}
            searchable={true}
            paginated={true}
            rowsPerPage={20}
            emptyMessage={t('analytics.no_domain_data')}
          />
        </Box>
      </Box>
    </ChartContainer>
  );
}
