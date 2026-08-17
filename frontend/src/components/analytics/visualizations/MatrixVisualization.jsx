import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import HeatmapChart from '../charts/HeatmapChart';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { buildBaseStats } from '../common/buildBaseStats';

export default function MatrixVisualization({ question, transformer, useIcons = false, showAvgSelections = false }) {
  const data = useMemo(() => transformer(question), [question, transformer]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const stats = [
    ...buildBaseStats(data, t),
    { label: t('analytics.stat_rows'), value: data.rows.length },
    ...(showAvgSelections ? [{ label: t('analytics.stat_avg_selections'), value: data.avgSelections }] : []),
  ];

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={3} />
        <HeatmapChart
          data={data.heatmapData}
          rows={data.rows}
          columns={useIcons ? data.columnsWithIcons : data.columns}
          {...(useIcons && data.rowsWithIcons ? { rowsWithIcons: data.rowsWithIcons } : {})}
          cellSize={60}
          showValues={true}
        />
      </Box>
    </ChartContainer>
  );
}
