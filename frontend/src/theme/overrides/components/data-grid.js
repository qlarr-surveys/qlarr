import { alpha } from '@mui/material/styles';
import { listClasses } from '@mui/material/List';
import { paperClasses } from '@mui/material/Paper';
import { buttonClasses } from '@mui/material/Button';
import { iconButtonClasses } from '@mui/material/IconButton';
import { inputLabelClasses } from '@mui/material/InputLabel';
import { formControlClasses } from '@mui/material/FormControl';
import { listItemIconClasses } from '@mui/material/ListItemIcon';
import { circularProgressClasses } from '@mui/material/CircularProgress';

import { paper } from '../../css';

// ----------------------------------------------------------------------

export function dataGrid(theme) {
  const paperStyles = paper({ theme, dropdown: true });

  return {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          '--unstable_DataGrid-radius': 0,
          '--unstable_DataGrid-headWeight': theme.typography.fontWeightSemiBold,
          borderWidth: 0,
        },
        withBorderColor: {
          borderColor: theme.palette.divider,
        },
        // Column
        columnHeaders: {
          borderBottom: 0,
        },
        columnHeader: {
          fontSize: 14,
          color: theme.palette.text.secondary,
          backgroundColor: theme.palette.background.neutral,
          '&--sorted': {
            color: theme.palette.text.primary,
          },
        },
        columnSeparator: {
          color: theme.palette.divider,
        },
        // Row, Cell
        cell: {
          borderBottom: `1px dashed`,
          '&--editing': {
            boxShadow: 'none !important',
            backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`,
          },
        },
        // Toolbar
        toolbarContainer: {
          gap: theme.spacing(2),
          padding: theme.spacing(2),
        },
        toolbarQuickFilter: {
          padding: 0,
          width: '100%',
          [theme.breakpoints.up('md')]: {
            width: 'unset',
          },
        },
        // Paper
        paper: {
          ...paperStyles,
          padding: 0,
        },
        menu: {
          [`& .${paperClasses.root}`]: {
            ...paperStyles,
            minWidth: 140,
          },
          [`& .${listClasses.root}`]: {
            padding: 0,
            [`& .${listItemIconClasses.root}`]: {
              minWidth: 0,
              marginRight: theme.spacing(2),
            },
          },
        },
        // Icons
        menuIcon: {
          [`& .${iconButtonClasses.root}`]: {
            margin: theme.spacing(0, 1),
            padding: theme.spacing(0.25),
          },
        },
        iconButtonContainer: {
          [`& .${iconButtonClasses.root}`]: {
            padding: theme.spacing(0.25),
            marginLeft: theme.spacing(1),
          },
        },
        // Footer
        footerContainer: {
          minHeight: 'auto',
          borderTop: `1px dashed`,
        },
        selectedRowCount: {
          display: 'none',
          whiteSpace: 'nowrap',
        },
        overlay: {
          [`& .${circularProgressClasses.root}`]: {
            color: theme.palette.text.primary,
          },
        },
        // Columns Panel
        panelHeader: {
          padding: theme.spacing(2, 2, 0, 2),
        },
        panelContent: {
          padding: theme.spacing(1),
        },
        columnsPanelRow: {
          margin: theme.spacing(0.5, 0),
        },
        panelFooter: {
          display: 'none',
          gap: theme.spacing(1),
          padding: theme.spacing(2),
          justifyContent: 'flex-end',
          borderTop: `dashed 1px ${theme.palette.divider}`,
          [`& .${buttonClasses.root}`]: {
            padding: theme.spacing(0.5, 1.5),
            '&:first-of-type': {
              border: `solid 1px ${alpha(theme.palette.grey[500], 0.24)}`,
            },
            '&:last-of-type': {
              color: theme.palette.background.paper,
              backgroundColor: theme.palette.text.primary,
            },
          },
        },
        filterForm: {
          alignItems: 'center',
          gap: theme.spacing(1.5),
          padding: theme.spacing(1),
        },
        filterFormValueInput: {
          [`& .${formControlClasses.root}`]: {
            width: '100%',
          },
          [`& .${inputLabelClasses.root}`]: {
            transform: 'translate(14px, -9px) scale(0.75)',
          },
        },
      },
    },
  };
}
