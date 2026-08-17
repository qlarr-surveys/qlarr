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
import ImageGallery from '../common/ImageGallery';
import CategoryLegend from '../common/CategoryLegend';
import { transformImageSCQData, resolveImageUrl } from '~/analytics/utils/dataTransformers';

export default function ImageSCQVisualization({ question }) {
  const [viewType, setViewType] = useState('gallery');
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const data = useMemo(() => transformImageSCQData(question), [question]);
  const images = question.images || [];

  const tabs = [
    { value: 'gallery', label: t('analytics.tab_gallery') },
    { value: 'donut', label: t('analytics.tab_donut') },
    { value: 'bar', label: t('analytics.tab_bar') },
  ];

  const stats = [
    ...buildBaseStats(data, t),
    { label: t('analytics.most_selected'), ...formatTopChoice(data.topChoice, t) },
  ];

  const galleryImages = images.map((img, i) => {
    const pieItem = data.pieData.find((p) => p.imageId === img.id);
    return {
      ...img,
      url: resolveImageUrl(img.url),
      label: img.label || t('analytics.image_fallback', { index: i + 1 }),
      count: pieItem?.value || 0,
      percentage: pieItem?.percentage || 0,
      color: pieItem?.fill,
    };
  });

  return (
    <ChartContainer
      actions={<ChartTabs tabs={tabs} activeTab={viewType} onChange={setViewType} />}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StatsRow stats={stats} columns={2} />

        {viewType === 'gallery' && (
          <ImageGallery images={galleryImages} columns={3} showLabels={true} showStats={true} />
        )}

        {viewType === 'donut' && (
          <>
            <PieDonutChart data={data.pieData} height={350} showLegend={false} />
            <CategoryLegend items={data.pieData} />
          </>
        )}

        {viewType === 'bar' && (
          <HorizontalBarChart data={data.barData} height={Math.max(300, data.barData.length * 50)} />
        )}
      </Box>
    </ChartContainer>
  );
}
