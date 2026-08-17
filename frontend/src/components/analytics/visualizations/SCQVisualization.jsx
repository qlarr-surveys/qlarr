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
import { transformSCQData } from '~/analytics/utils/dataTransformers';

export default function SCQVisualization({ question }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const [chartType, setChartType] = useState('donut');
  const data = useMemo(() => transformSCQData(question), [question]);

  const tabs = [
    { value: 'donut', label: t('analytics.tab_donut') },
    { value: 'bar', label: t('analytics.tab_bar') },
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
        {/* Stats Row */}
        <StatsRow stats={stats} columns={2} />

        {/* Chart */}
        <Box sx={{ minHeight: 300 }}>
          {chartType === 'donut' && (
            <PieDonutChart data={data.pieData} height={350} />
          )}
          {chartType === 'bar' && (
            <HorizontalBarChart data={data.barData} height={300} />
          )}
        </Box>
      </Box>
    </ChartContainer>
  );
}
