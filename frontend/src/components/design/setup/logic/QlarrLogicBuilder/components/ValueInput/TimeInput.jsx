import React from 'react';
import PropTypes from 'prop-types';
import { TextField } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { DATE_FORMATS, PICKER_POPPER_PROPS } from '../../config/constants';
import styles from '../../QlarrLogicBuilder.module.css';
import { getCompactTextFieldProps } from '../../utils/inputProps';

export const TimeInput = React.memo(function TimeInput({ value, onChange, t, compact = false }) {
  const timeValue = value ? dayjs(`2000-01-01 ${value}`) : null;
  const textFieldProps = getCompactTextFieldProps(compact, t('logic_builder.value'));

  return (
    <TimePicker
      className={compact ? undefined : styles.valueInput}
      label={textFieldProps.label}
      value={timeValue}
      onChange={(newValue) => {
        onChange(newValue ? newValue.format(DATE_FORMATS.TIME_VALUE) : '');
      }}
      inputFormat={DATE_FORMATS.TIME_DISPLAY}
      PopperProps={PICKER_POPPER_PROPS}
      renderInput={(params) => <TextField {...params} {...textFieldProps} />}
    />
  );
});

TimeInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  compact: PropTypes.bool,
};
