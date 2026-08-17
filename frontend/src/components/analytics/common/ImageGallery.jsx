import { useState } from 'react';
import { Box, Grid, Typography, Card } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import { grey, warning, info } from '~/theme/palette';

// Placeholder SVG for mock images
const PlaceholderImage = ({ label, color = info.main }) => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
    <rect width="100" height="100" fill={`${color}20`} />
    <rect x="20" y="20" width="60" height="60" fill={color} rx="5" />
    <text
      x="50"
      y="55"
      textAnchor="middle"
      fill="white"
      fontSize="12"
      fontWeight="bold"
    >
      {label?.slice(0, 3).toUpperCase() || 'IMG'}
    </text>
  </svg>
);

export default function ImageGallery({
  images,
  columns = 4,
  showLabels = true,
  showStats = false,
  onImageClick = null,
  selectedId = null,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  return (
    <Grid container spacing={2}>
      {images.map((image, index) => (
        <Grid item xs={12 / columns} key={image.id || index}>
          <Card
            sx={{
              position: 'relative',
              cursor: onImageClick ? 'pointer' : 'default',
              border: 2,
              borderColor: selectedId === image.id ? 'primary.main' : 'transparent',
              boxShadow: selectedId === image.id ? 4 : 1,
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: selectedId === image.id ? 'primary.main' : 'grey.200',
              },
            }}
            onClick={() => onImageClick?.(image)}
            onMouseEnter={() => setHoveredId(image.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Image */}
            <Box sx={{ aspectRatio: '1', bgcolor: 'grey.100', position: 'relative' }}>
              {image.url && !image.url.includes('mock-images') ? (
                <img
                  src={image.url}
                  alt={image.label || `Image ${index + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <PlaceholderImage label={image.label} color={image.color} />
              )}

              {/* Hover overlay with stats */}
              {showStats && image.count !== undefined && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: hoveredId === image.id ? 1 : 0,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {image.count}
                    </Typography>
                    <Typography variant="body2">
                      {image.percentage !== undefined ? `${image.percentage}%` : t('analytics.selections')}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Badge for ranking */}
              {image.rank !== undefined && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {image.rank}
                </Box>
              )}

              {/* Selection indicator */}
              {selectedId === image.id && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: 'primary.main',
                  }}
                >
                  <CheckCircleIcon />
                </Box>
              )}
            </Box>

            {/* Label */}
            {showLabels && image.label && (
              <Box sx={{ p: 1, bgcolor: 'background.paper' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: 'text.primary',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {image.label}
                </Typography>
                {showStats && image.count !== undefined && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block' }}>
                    {image.count} ({image.percentage}%)
                  </Typography>
                )}
              </Box>
            )}
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// Ranked image gallery with positions
export function RankedImageGallery({ images, showAverageRank = true }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const getRankColor = (index) => {
    if (index === 0) return warning.main; // gold
    if (index === 1) return grey[500]; // silver
    if (index === 2) return warning.dark; // bronze
    return grey[300]; // gray
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {images.map((image, index) => (
        <Box
          key={image.id || index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1.5,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Rank badge */}
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: getRankColor(index),
              color: 'white',
              fontWeight: 'bold',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {index + 1}
          </Box>

          {/* Image thumbnail */}
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'grey.100',
              flexShrink: 0,
            }}
          >
            {image.imageUrl && !image.imageUrl.includes('mock-images') ? (
              <img
                src={image.imageUrl}
                alt={image.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <PlaceholderImage label={image.name} />
            )}
          </Box>

          {/* Info */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {image.name}
            </Typography>
            {showAverageRank && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('analytics.average_rank_colon', { rank: image.averageRank })}
              </Typography>
            )}
          </Box>

          {/* Stats */}
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" sx={{ color: 'success.main' }}>
              {t('analytics.count_first', { count: image.firstPlace })}
            </Typography>
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              {t('analytics.count_last', { count: image.lastPlace })}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
