import { Box, Typography } from '@mui/material';

export default function CategoryLegend({ items, showPercentage = true }) {
  const total = items.reduce((sum, item) => sum + (item.count || item.value || 0), 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {items.map((item, index) => {
        const count = item.count || item.value || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

        return (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '3px',
                  bgcolor: item.color || item.fill,
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" dir="auto" sx={{ font: '400 13.5px Rubik, sans-serif', color: '#2c3358' }}>
                {item.label || item.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ font: '600 13.5px Rubik, sans-serif', color: '#1b2150' }}>
                {count}
              </Typography>
              {showPercentage && (
                <Typography variant="body2" sx={{ font: '400 13.5px Rubik, sans-serif', color: '#5b6189' }}>
                  ({percentage}%)
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
