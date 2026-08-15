import React from 'react';
import useIsFirstRender from '~/hooks/useIsFirstRender';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts';
import PieDonutChart from './PieDonutChart';
import NPSBenchmarkScale from './NPSBenchmarkScale';
import CategoryLegend from '../common/CategoryLegend';
import { grey } from '~/theme/palette';
import { NPS_COLORS } from '~/analytics/utils/colors';

import ChartTooltip, { titleStyle, detailStyle } from '../common/ChartTooltip';

function NPSDistributionTooltip(props) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  return (
    <ChartTooltip {...props} renderContent={(data) => {
      const category =
        parseInt(data.score) <= 6
          ? t('analytics.detractor')
          : parseInt(data.score) <= 8
          ? t('analytics.passive')
          : t('analytics.promoter');
      return (
        <>
          <p style={titleStyle}>{t('analytics.score_label', { score: data.score })}</p>
          <p style={detailStyle}>{t('analytics.count_label', { count: data.count })}</p>
          <p style={{ fontSize: 14, color: data.fill, margin: 0 }}>{category}</p>
        </>
      );
    }} />
  );
}

// Distribution Chart Component (score 0-10 histogram)
function NPSDistributionChart({ data, height = 250 }) {
  const isFirstRender = useIsFirstRender();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="score" tick={{ fontSize: 12 }} />
        <YAxis hide />
        <Tooltip content={<NPSDistributionTooltip />} />
        <ReferenceLine x="6" stroke={NPS_COLORS.detractor} strokeDasharray="3 3" />
        <ReferenceLine x="8" stroke={NPS_COLORS.passive} strokeDasharray="3 3" />
        <Bar dataKey="count" isAnimationActive={isFirstRender} animationBegin={0} animationDuration={800}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
          <LabelList dataKey="count" position="top" fill={grey[700]} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const MemoizedNPSDistributionChart = React.memo(NPSDistributionChart);

function NPSChart({ score, categoryData, distributionData }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const legendItems = [
    { name: t('analytics.detractors_range'), value: categoryData[0]?.value || 0, fill: NPS_COLORS.detractor },
    { name: t('analytics.passives_range'), value: categoryData[1]?.value || 0, fill: NPS_COLORS.passive },
    { name: t('analytics.promoters_range'), value: categoryData[2]?.value || 0, fill: NPS_COLORS.promoter },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Benchmark Scale */}
      <NPSBenchmarkScale score={score} />

      {/* Two-column: Donut + Distribution */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}
      >
        {/* Category Breakdown (Donut) */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary', mb: 1 }}>
            {t('analytics.category_breakdown')}
          </Typography>
          <PieDonutChart
            data={categoryData}
            showLegend={false}
            height={250}
          />
          <Box sx={{ mt: 2 }}>
            <CategoryLegend items={legendItems} />
          </Box>
        </Box>

        {/* Score Distribution */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary', mb: 1 }}>
            {t('analytics.score_distribution')}
          </Typography>
          <MemoizedNPSDistributionChart data={distributionData} />
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(NPSChart);
export { NPSDistributionChart };
