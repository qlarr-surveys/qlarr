import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { TextField } from '@mui/material';
import { DatePicker, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { FIELD_TYPES, DATE_FORMATS, PICKER_POPPER_PROPS } from '../../config/constants';
import { getCompactTextFieldProps } from '../../utils/inputProps';
import { isRangeInverted } from '../../utils/rangeValidation';
import styles from '../../QlarrLogicBuilder.module.css';

export const RangeInput = React.memo(function RangeInput({ fieldType, value, onChange, t, compact = false }) {
  const [localValue, setLocalValue] = useState(value || [null, null]);

  // Sync local state when parent value changes
  useEffect(() => {
    setLocalValue(value || [null, null]);
  }, [value]);

  const [min, max] = localValue;
  const inverted = isRangeInverted(min, max, fieldType);

  const handleMinChange = (newMin) => {
    const next = [newMin, max || ''];
    setLocalValue(next);
    if (!isRangeInverted(newMin, max || '', fieldType)) {
      onChange(next);
    }
  };

  const handleMaxChange = (newMax) => {
    const next = [min || '', newMax];
    setLocalValue(next);
    if (!isRangeInverted(min || '', newMax, fieldType)) {
      onChange(next);
    }
  };

  const errorElement = inverted ? (
    <span className={styles.rangeError}>{t('logic_builder.range_error')}</span>
  ) : null;

  // Number range
  if (fieldType === FIELD_TYPES.NUMBER) {
    const minProps = getCompactTextFieldProps(compact, t('logic_builder.min'));
    const maxProps = getCompactTextFieldProps(compact, t('logic_builder.max'));
    return (
      <div className={styles.rangeInputWrapper}>
        <div className={styles.rangeInput}>
          <TextField
            type="number"
            value={min ?? ''}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            error={inverted}
            {...minProps}
            sx={{ ...minProps.sx, flex: 1, minWidth: 0 }}
          />
          <span className={styles.rangeSeparator}>-</span>
          <TextField
            type="number"
            value={max ?? ''}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            error={inverted}
            {...maxProps}
            sx={{ ...maxProps.sx, flex: 1, minWidth: 0 }}
          />
        </div>
        {errorElement}
      </div>
    );
  }

  // Date range
  if (fieldType === FIELD_TYPES.DATE) {
    const fromProps = getCompactTextFieldProps(compact, t('logic_builder.from'));
    const toProps = getCompactTextFieldProps(compact, t('logic_builder.to'));
    return (
      <div className={styles.rangeInputWrapper}>
        <div className={styles.rangeInput}>
          <DatePicker
            label={compact ? undefined : t('logic_builder.from')}
            value={min ? dayjs(min) : null}
            onChange={(newValue) => {
              handleMinChange(newValue ? newValue.format(DATE_FORMATS.DATE_VALUE) : '');
            }}
            inputFormat={DATE_FORMATS.DATE_DISPLAY}
            PopperProps={PICKER_POPPER_PROPS}
            renderInput={(params) => (
              <TextField
                {...params}
                {...fromProps}
                sx={{ ...fromProps.sx, flex: 1, minWidth: 0 }}
                error={inverted}
              />
            )}
          />
          <span className={styles.rangeSeparator}>-</span>
          <DatePicker
            label={compact ? undefined : t('logic_builder.to')}
            value={max ? dayjs(max) : null}
            onChange={(newValue) => {
              handleMaxChange(newValue ? newValue.format(DATE_FORMATS.DATE_VALUE) : '');
            }}
            inputFormat={DATE_FORMATS.DATE_DISPLAY}
            PopperProps={PICKER_POPPER_PROPS}
            renderInput={(params) => (
              <TextField
                {...params}
                {...toProps}
                sx={{ ...toProps.sx, flex: 1, minWidth: 0 }}
                error={inverted}
              />
            )}
          />
        </div>
        {errorElement}
      </div>
    );
  }

  // Time range
  if (fieldType === FIELD_TYPES.TIME) {
    const fromProps = getCompactTextFieldProps(compact, t('logic_builder.from'));
    const toProps = getCompactTextFieldProps(compact, t('logic_builder.to'));
    return (
      <div className={styles.rangeInputWrapper}>
        <div className={styles.rangeInput}>
          <TimePicker
            label={compact ? undefined : t('logic_builder.from')}
            value={min ? dayjs(`2000-01-01 ${min}`) : null}
            onChange={(newValue) => {
              handleMinChange(newValue ? newValue.format(DATE_FORMATS.TIME_VALUE) : '');
            }}
            inputFormat={DATE_FORMATS.TIME_DISPLAY}
            renderInput={(params) => (
              <TextField
                {...params}
                {...fromProps}
                sx={{ ...fromProps.sx, flex: 1, minWidth: 0 }}
                error={inverted}
              />
            )}
          />
          <span className={styles.rangeSeparator}>-</span>
          <TimePicker
            label={compact ? undefined : t('logic_builder.to')}
            value={max ? dayjs(`2000-01-01 ${max}`) : null}
            onChange={(newValue) => {
              handleMaxChange(newValue ? newValue.format(DATE_FORMATS.TIME_VALUE) : '');
            }}
            inputFormat={DATE_FORMATS.TIME_DISPLAY}
            renderInput={(params) => (
              <TextField
                {...params}
                {...toProps}
                sx={{ ...toProps.sx, flex: 1, minWidth: 0 }}
                error={inverted}
              />
            )}
          />
        </div>
        {errorElement}
      </div>
    );
  }

  // DateTime range
  if (fieldType === FIELD_TYPES.DATETIME) {
    const fromProps = getCompactTextFieldProps(compact, t('logic_builder.from'));
    const toProps = getCompactTextFieldProps(compact, t('logic_builder.to'));
    return (
      <div className={styles.rangeInputWrapper}>
        <div className={styles.rangeInput}>
          <DateTimePicker
            label={compact ? undefined : t('logic_builder.from')}
            value={min ? dayjs(min) : null}
            onChange={(newValue) => {
              handleMinChange(newValue ? newValue.format(DATE_FORMATS.DATETIME_VALUE) : '');
            }}
            inputFormat={DATE_FORMATS.DATETIME_DISPLAY}
            renderInput={(params) => (
              <TextField
                {...params}
                {...fromProps}
                sx={{ ...fromProps.sx, flex: 1, minWidth: 0 }}
                error={inverted}
              />
            )}
          />
          <span className={styles.rangeSeparator}>-</span>
          <DateTimePicker
            label={compact ? undefined : t('logic_builder.to')}
            value={max ? dayjs(max) : null}
            onChange={(newValue) => {
              handleMaxChange(newValue ? newValue.format(DATE_FORMATS.DATETIME_VALUE) : '');
            }}
            inputFormat={DATE_FORMATS.DATETIME_DISPLAY}
            renderInput={(params) => (
              <TextField
                {...params}
                {...toProps}
                sx={{ ...toProps.sx, flex: 1, minWidth: 0 }}
                error={inverted}
              />
            )}
          />
        </div>
        {errorElement}
      </div>
    );
  }

  // Default: text range
  const minTextProps = getCompactTextFieldProps(compact, t('logic_builder.min'));
  const maxTextProps = getCompactTextFieldProps(compact, t('logic_builder.max'));
  return (
    <div className={styles.rangeInputWrapper}>
      <div className={styles.rangeInput}>
        <TextField
          value={min ?? ''}
          onChange={(e) => handleMinChange(e.target.value)}
          error={inverted}
          {...minTextProps}
          sx={{ ...minTextProps.sx, flex: 1, minWidth: 0 }}
        />
        <span className={styles.rangeSeparator}>-</span>
        <TextField
          value={max ?? ''}
          onChange={(e) => handleMaxChange(e.target.value)}
          error={inverted}
          {...maxTextProps}
          sx={{ ...maxTextProps.sx, flex: 1, minWidth: 0 }}
        />
      </div>
      {errorElement}
    </div>
  );
});

RangeInput.propTypes = {
  fieldType: PropTypes.string.isRequired,
  value: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  compact: PropTypes.bool,
};
