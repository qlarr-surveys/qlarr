import React from 'react';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';

// The chart-type switch on a question card: the chosen one dark, the others
// outlined, as small separate buttons.
function ChartTabs({ tabs, activeTab, onChange }) {
  return (
    <ToggleButtonGroup
      value={activeTab}
      exclusive
      onChange={(_, value) => value && onChange(value)}
      size="small"
      sx={{
        gap: '4px',
        '& .MuiToggleButton-root, & .MuiToggleButtonGroup-grouped:not(:first-of-type), & .MuiToggleButtonGroup-grouped:not(:last-of-type)':
          {
            height: 30,
            px: '14px',
            py: 0,
            m: 0,
            font: '500 13px Rubik, sans-serif',
            textTransform: 'none',
            color: '#2c3358',
            bgcolor: '#fff',
            border: '1px solid #cfd5e8',
            borderRadius: '6px',
            '&:hover': { bgcolor: '#f4f6fc' },
            '&.Mui-selected, &.Mui-selected:hover': {
              bgcolor: '#363b4a',
              borderColor: '#363b4a',
              color: '#fff',
            },
            '&.Mui-focusVisible': {
              outline: '2px solid #3a46d8',
              outlineOffset: 1,
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
