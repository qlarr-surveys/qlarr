import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { buildBaseStats } from '../common/buildBaseStats';
import { formatTopChoice } from '../common/formatTopChoice';
import ImageGallery from '../common/ImageGallery';
import IconLegend from '../common/IconLegend';
import { transformIconMCQData, resolveImageUrl } from '~/analytics/utils/dataTransformers';

export default function IconMCQVisualization({ question }) {
  const data = useMemo(() => transformIconMCQData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const images = question.images || [];

  const stats = [
    ...buildBaseStats(data, t),
    { label: t('analytics.most_popular'), ...formatTopChoice(data.topChoice, t) },
  ];

  const galleryImages = images.map((img, i) => {
    const barItem = data.barData.find((d) => d.imageId === img.id);
    return {
      ...img,
      url: resolveImageUrl(img.url),
      label: img.label || t('analytics.option_fallback', { index: i + 1 }),
      count: barItem?.count || 0,
      percentage: barItem?.percentage || 0,
      color: barItem?.fill,
    };
  });

  const tableData = data.barData.map((item) => ({
    option: item.name,
    count: item.count,
    percentage: `${item.percentage}%`,
  }));

  const tableColumns = [
    { key: 'option', label: t('analytics.col_option'), sortable: true },
    { key: 'count', label: t('analytics.col_count'), sortable: true, align: 'right' },
    { key: 'percentage', label: t('analytics.col_percentage'), sortable: true, align: 'right' },
  ];

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={2} />

        <ImageGallery images={galleryImages} columns={3} showLabels={true} showStats={true} />


        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary', mb: 1.5 }}>
            {t('analytics.selection_frequency')}
          </Typography>
          <IconLegend items={data.barData} />
        </Box>
      </Box>
    </ChartContainer>
  );
}
