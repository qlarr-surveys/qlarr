import React from 'react';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';

function ChartTabs({ tabs, activeTab, onChange }) {
  return (
    <ToggleButtonGroup
      value={activeTab}
      exclusive
      onChange={(_, value) => value && onChange(value)}
      size="small"
      sx={{
        '& .MuiToggleButton-root': {
          px: 2,
          py: 0.5,
          fontSize: 14,
          fontWeight: 500,
          textTransform: 'none',
          border: '1px solid',
          borderColor: 'divider',
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          },
        },
      }}
    >
      {tabs.map((tab) => (
        <ToggleButton key={tab.value} value={tab.value}>
          {tab.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export default React.memo(ChartTabs);
