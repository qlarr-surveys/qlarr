import { radioClasses } from '@mui/material/Radio';

// ----------------------------------------------------------------------

export function radio(theme) {
  return {
    // CHECKBOX, RADIO, SWITCH
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          ...theme.typography.body2,
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: ({ ownerState }) => {
          const { color } = ownerState;

          return {
            padding: theme.spacing(1),
            ...(color === 'default' && {
              [`&.${radioClasses.checked}`]: {
                color: theme.palette.text.primary,
              },
            }),
            [`&.${radioClasses.disabled}`]: {
              color: theme.palette.action.disabled,
            },
          };
        },
      },
    },
  };
}
