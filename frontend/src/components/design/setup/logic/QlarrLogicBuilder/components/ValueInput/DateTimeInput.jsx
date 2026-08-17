import React from 'react';
import PropTypes from 'prop-types';
import { TextField } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { DATE_FORMATS, PICKER_POPPER_PROPS } from '../../config/constants';
import styles from '../../QlarrLogicBuilder.module.css';
import { getCompactTextFieldProps } from '../../utils/inputProps';

export const DateTimeInput = React.memo(function DateTimeInput({ value, onChange, t, compact = false }) {
  const dateTimeValue = value ? dayjs(value) : null;
  const textFieldProps = getCompactTextFieldProps(compact, t('logic_builder.value'));

  return (
    <DateTimePicker
      className={compact ? undefined : styles.valueInput}
      label={textFieldProps.label}
      value={dateTimeValue}
      onChange={(newValue) => {
        onChange(newValue ? newValue.format(DATE_FORMATS.DATETIME_VALUE) : '');
      }}
      inputFormat={DATE_FORMATS.DATETIME_DISPLAY}
      PopperProps={PICKER_POPPER_PROPS}
      renderInput={(params) => <TextField {...params} {...textFieldProps} />}
    />
  );
});

DateTimeInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  compact: PropTypes.bool,
};
