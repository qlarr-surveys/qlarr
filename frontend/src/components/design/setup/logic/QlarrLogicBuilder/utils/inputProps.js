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
    // A condition's value, drawn to docs/design/editor-phase-3.3.html: a
    // white box under the condition's rule.
    return {
      placeholder: label,
      size: 'small',
      variant: 'outlined',
      fullWidth: true,
      sx: {
        width: '100%',
        minWidth: '50px',
        '& .MuiOutlinedInput-root': {
          height: 44,
          fontFamily: 'Rubik, sans-serif',
          fontSize: 15,
          backgroundColor: '#fff !important',
          borderRadius: '8px',
          '& fieldset': {
            borderColor: '#d6dae8',
          },
          '&:hover fieldset': {
            borderColor: '#b9bff0',
          },
          '&.Mui-focused': {
            backgroundColor: '#fff !important',
            boxShadow: '0 0 0 2px #e3e6ff',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#3a46d8',
            borderWidth: '1px',
          },
        },
        '& .MuiOutlinedInput-input': {
          padding: '0 12px',
          height: '100%',
          minWidth: '40px',
          backgroundColor: '#fff !important',
          color: '#1b2150',
          '&::placeholder': {
            color: '#a3a8c3',
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
