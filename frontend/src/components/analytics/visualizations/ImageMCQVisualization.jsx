import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import ChartContainer from '../common/ChartContainer';
import { StatsRow } from '../common/StatCard';
import { buildBaseStats } from '../common/buildBaseStats';
import { formatTopChoice } from '../common/formatTopChoice';
import ImageGallery from '../common/ImageGallery';
import CategoryLegend from '../common/CategoryLegend';
import { transformImageMCQData, resolveImageUrl } from '~/analytics/utils/dataTransformers';

export default function ImageMCQVisualization({ question }) {
  const data = useMemo(() => transformImageMCQData(question), [question]);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const stats = [
    ...buildBaseStats(data, t),
    { label: t('analytics.most_popular'), ...formatTopChoice(data.topChoice, t) },
    { label: t('analytics.stat_images'), value: question.images.length },
  ];

  const galleryImages = question.images.map((img, i) => {
    const barItem = data.barData.find((b) => b.imageId === img.id);
    return {
      ...img,
      url: resolveImageUrl(img.url),
      label: img.label || t('analytics.image_fallback', { index: i + 1 }),
      count: barItem?.count || 0,
      percentage: barItem?.percentage || 0,
      color: barItem?.fill,
    };
  });

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={3} />
        <ImageGallery images={galleryImages} columns={3} showLabels={true} showStats={true} />
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary', mb: 1.5 }}>
            {t('analytics.selection_frequency')}
          </Typography>
          <CategoryLegend items={data.barData} showPercentage={true} />
        </Box>
      </Box>
    </ChartContainer>
  );
}
