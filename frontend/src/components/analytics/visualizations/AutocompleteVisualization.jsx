import { useState, useMemo } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import PieDonutChart from '../charts/PieDonutChart';
import HorizontalBarChart from '../charts/HorizontalBarChart';
import ChartContainer from '../common/ChartContainer';
import ChartTabs from '../common/ChartTabs';
import { StatsRow } from '../common/StatCard';
import { buildBaseStats } from '../common/buildBaseStats';
import { formatTopChoice } from '../common/formatTopChoice';
import { transformAutocompleteData } from '~/analytics/utils/dataTransformers';

export default function AutocompleteVisualization({ question }) {
  const [chartType, setChartType] = useState('bar');
  const data = useMemo(() => transformAutocompleteData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const tabs = [
    { value: 'bar', label: t('analytics.tab_bar_chart') },
    { value: 'pie', label: t('analytics.tab_pie_chart') },
  ];

  const stats = [
    ...buildBaseStats(data, t),
    { label: t('analytics.most_selected'), ...formatTopChoice(data.topChoice, t) },
  ];

  return (
    <ChartContainer
      actions={<ChartTabs tabs={tabs} activeTab={chartType} onChange={setChartType} />}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={2} />
        <Box sx={{ minHeight: 300 }}>
          {chartType === 'bar' && <HorizontalBarChart data={data.barData} height={300} />}
          {chartType === 'pie' && <PieDonutChart data={data.pieData} height={350} />}
        </Box>
      </Box>
    </ChartContainer>
  );
}
