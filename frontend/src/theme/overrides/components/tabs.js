import { tabClasses } from '@mui/material/Tab';

// ----------------------------------------------------------------------

export function tabs(theme) {
  return {
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: theme.palette.text.primary,
        },
        // Height as well as width: a scroll button is a flex child of the tab
        // row, so without one it stretches to the row's height and the 50%
        // radius draws an ellipse rather than the round target intended.
        scrollButtons: {
          width: 48,
          height: 48,
          borderRadius: '50%',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          padding: 0,
          opacity: 1,
          minWidth: 48,
          minHeight: 48,
          fontWeight: theme.typography.fontWeightSemiBold,
          '&:not(:last-of-type)': {
            marginRight: theme.spacing(3),
            [theme.breakpoints.up('sm')]: {
              marginRight: theme.spacing(5),
            },
          },
          [`&:not(.${tabClasses.selected})`]: {
            color: theme.palette.text.secondary,
          },
        },
      },
    },
  };
}
