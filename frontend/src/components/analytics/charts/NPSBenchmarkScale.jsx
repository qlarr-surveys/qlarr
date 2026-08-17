import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import { grey } from '~/theme/palette';
import { NPS_BENCHMARK_COLORS } from '~/analytics/utils/colors';

function NPSBenchmarkScale({ score }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const ZONES = useMemo(() => [
    { label: t('analytics.needs_improvement'), min: -100, max: 0, color: NPS_BENCHMARK_COLORS.needsImprovement, width: '50%' },
    { label: t('analytics.good'), min: 0, max: 30, color: NPS_BENCHMARK_COLORS.good, width: '15%' },
    { label: t('analytics.great'), min: 30, max: 70, color: NPS_BENCHMARK_COLORS.great, width: '20%' },
    { label: t('analytics.excellent'), min: 70, max: 100, color: NPS_BENCHMARK_COLORS.excellent, width: '15%' },
  ], [t]);
  const markerPosition = ((score + 100) / 200) * 100;
  // Clamp label so it doesn't overflow the container
  const clampedPosition = Math.max(4, Math.min(96, markerPosition));

  return (
    <Box sx={{ px: 2, pt: 4, pb: 1 }}>
      {/* Scale bar with marker */}
      <Box sx={{ position: 'relative' }}>
        {/* Marker above the bar */}
        <Box
          sx={{
            position: 'absolute',
            left: `${clampedPosition}%`,
            top: -28,
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 14,
              color: 'text.primary',
              lineHeight: 1,
              mb: 0.5,
            }}
          >
            {score}
          </Typography>
          {/* Triangle pointer */}
          <Box
            sx={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `7px solid ${grey[900]}`,
            }}
          />
        </Box>

        {/* Colored zone bar */}
        <Box sx={{ display: 'flex', height: 28, borderRadius: 1.5, overflow: 'hidden' }}>
          {ZONES.map((zone) => (
            <Box
              key={zone.label}
              sx={{
                width: zone.width,
                bgcolor: zone.color,
                opacity: 0.85,
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 1 },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Zone labels and tick marks */}
      <Box sx={{ display: 'flex', mt: 0.75 }}>
        {ZONES.map((zone) => (
          <Box key={zone.label} sx={{ width: zone.width, textAlign: 'center' }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontSize: 11, lineHeight: 1.2 }}
            >
              {zone.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Tick values */}
      <Box sx={{ position: 'relative', height: 16, mt: 0.25 }}>
        {[-100, 0, 30, 70, 100].map((tick) => {
          const pos = ((tick + 100) / 200) * 100;
          return (
            <Typography
              key={tick}
              variant="caption"
              sx={{
                position: 'absolute',
                left: `${pos}%`,
                transform: 'translateX(-50%)',
                color: 'text.disabled',
                fontSize: 10,
              }}
            >
              {tick}
            </Typography>
          );
        })}
      </Box>
    </Box>
  );
}

export default React.memo(NPSBenchmarkScale);
