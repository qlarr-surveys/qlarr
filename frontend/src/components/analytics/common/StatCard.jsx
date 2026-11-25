import React from 'react';
import { Box, Typography } from '@mui/material';

// A label over one number, as the phase-3.3 analytics cards draw it.
const StatCard = React.memo(function StatCard({
  label,
  value,
  suffix = '',
  prefix = '',
  description = '',
  size = 'medium',
}) {
  const valueSize = { small: 18, medium: 22, large: 28 }[size];

  return (
    <Box
      sx={{
        p: '14px 16px',
        borderRadius: '10px',
        border: '1px solid #e3e6f0',
        bgcolor: '#fff',
        minWidth: 0,
      }}
    >
      <Typography
        component="div"
        sx={{
          font: '400 13px Rubik, sans-serif',
          color: '#5b6189',
        }}
      >
        {label}
      </Typography>
      <Typography
        component="div"
        dir="auto"
        title={typeof value === 'string' || typeof value === 'number' ? `${prefix}${value}${suffix}` : undefined}
        sx={{
          mt: '4px',
          fontFamily: 'Rubik, sans-serif',
          fontWeight: 600,
          fontSize: valueSize,
          lineHeight: `${valueSize + 6}px`,
          color: '#1b2150',
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
        <Typography
          component="div"
          sx={{ mt: '4px', font: '400 12.5px Rubik, sans-serif', color: '#5b6189' }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
});

export default StatCard;

// A row of stat cards. They share the row evenly and wrap below 140px each,
// so callers no longer pick a column count.
export const StatsRow = React.memo(function StatsRow({ stats }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
      }}
    >
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </Box>
  );
});
