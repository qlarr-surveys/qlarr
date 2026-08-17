import React from 'react';
import PropTypes from 'prop-types';
import { TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { DATE_FORMATS, PICKER_POPPER_PROPS } from '../../config/constants';
import styles from '../../QlarrLogicBuilder.module.css';
import { getCompactTextFieldProps } from '../../utils/inputProps';

export const DateInput = React.memo(function DateInput({ value, onChange, t, compact = false }) {
  const dateValue = value ? dayjs(value) : null;
  const textFieldProps = getCompactTextFieldProps(compact, t('logic_builder.value'));

  return (
    <DatePicker
      className={compact ? undefined : styles.valueInput}
      label={textFieldProps.label}
      value={dateValue}
      onChange={(newValue) => {
        onChange(newValue ? newValue.format(DATE_FORMATS.DATE_VALUE) : '');
      }}
      inputFormat={DATE_FORMATS.DATE_DISPLAY}
      PopperProps={PICKER_POPPER_PROPS}
      renderInput={(params) => <TextField {...params} {...textFieldProps} />}
    />
  );
});

DateInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  compact: PropTypes.bool,
};
