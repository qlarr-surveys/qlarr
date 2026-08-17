import { Box, Typography } from '@mui/material';

export default function IconLegend({ items, showPercentage = true }) {
  const total = items.reduce((sum, item) => sum + (item.count || item.value || 0), 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {items.map((item, index) => {
        const count = item.count || item.value || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

        return (
          <Box
            key={index}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: item.color || item.fill,
                  flexShrink: 0,
                }}
              />
              {item.iconUrl && (
                <Box
                  component="img"
                  src={item.iconUrl}
                  alt={item.label || item.name}
                  sx={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                />
              )}
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                {item.label || item.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                {count}
              </Typography>
              {showPercentage && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
