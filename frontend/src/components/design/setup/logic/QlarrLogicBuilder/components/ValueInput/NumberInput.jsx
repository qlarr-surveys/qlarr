import React from 'react';
import PropTypes from 'prop-types';
import { TextField } from '@mui/material';
import styles from '../../QlarrLogicBuilder.module.css';
import { getCompactTextFieldProps } from '../../utils/inputProps';

export const NumberInput = React.memo(function NumberInput({ value, onChange, t, compact = false }) {
  const textFieldProps = getCompactTextFieldProps(compact, t('logic_builder.value'));

  return (
    <TextField
      className={compact ? undefined : styles.valueInput}
      {...textFieldProps}
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
});

NumberInput.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  compact: PropTypes.bool,
};
