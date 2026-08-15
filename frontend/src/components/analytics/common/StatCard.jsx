import React from 'react';
import { Box, Typography } from '@mui/material';

const StatCard = React.memo(function StatCard({
  label,
  value,
  suffix = '',
  prefix = '',
  description = '',
  size = 'medium',
}) {
  const fontSizes = {
    small: { value: 20, label: 11 },
    medium: { value: 24, label: 13 },
    large: { value: 30, label: 15 },
  };

  const padding = {
    small: 1.5,
    medium: 2,
    large: 3,
  };

  return (
    <Box
      sx={{
        p: padding[size],
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minWidth: 0,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontWeight: 500,
          fontSize: fontSizes[size].label,
          display: 'block',
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        title={typeof value === 'string' || typeof value === 'number' ? `${prefix}${value}${suffix}` : undefined}
        sx={{
          fontWeight: 700,
          color: 'text.primary',
          fontSize: fontSizes[size].value,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {prefix}
        {value}
        {suffix}
      </Typography>
      {description && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
});

export default StatCard;

// Stats row component for displaying multiple stats
export const StatsRow = React.memo(function StatsRow({ stats, columns, minColumns = 4 }) {
  const cols = Math.max(columns ?? stats.length, minColumns);
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 2,
      }}
    >
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </Box>
  );
});
