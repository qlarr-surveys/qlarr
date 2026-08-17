/**
 * Generates common TextField props for compact/full mode rendering.
 * Used to reduce duplication across ValueInput components.
 *
 * @param {boolean} compact - Whether to render in compact mode
 * @param {string} label - The label text (used as label or placeholder based on compact mode)
 * @returns {Object} Props object to spread onto TextField or slotProps.textField
 */
export function getCompactTextFieldProps(compact, label) {
  if (compact) {
    return {
      placeholder: label,
      size: 'small',
      variant: 'outlined',
      fullWidth: true,
      sx: {
        width: '100%',
        minWidth: '50px',
        '& .MuiOutlinedInput-root': {
          height: 32,
          fontSize: 14,
          backgroundColor: '#fff !important',
          borderRadius: '6px',
          '& fieldset': {
            borderColor: '#e0e0e0',
          },
          '&:hover fieldset': {
            borderColor: '#bdbdbd',
          },
          '&.Mui-focused': {
            backgroundColor: '#fff !important',
          },
        },
        '& .MuiOutlinedInput-input': {
          padding: '6px 8px',
          minWidth: '40px',
          backgroundColor: '#fff !important',
          color: '#181735',
          '&::placeholder': {
            color: '#9e9e9e',
            opacity: 1,
          },
          // Remove default number input styling
          '&[type="number"]': {
            MozAppearance: 'textfield',
            backgroundColor: '#fff !important',
            '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
              WebkitAppearance: 'none',
              margin: 0,
            },
          },
        },
        '& .MuiInputBase-root': {
          backgroundColor: '#fff !important',
        },
      },
    };
  }

  return {
    label,
    size: 'small',
    variant: 'filled',
    fullWidth: true,
  };
}
