import React from 'react';
import PropTypes from 'prop-types';
import { FormControl, Select, MenuItem, Box, Typography } from '@mui/material';
import { useLogicBuilder } from '../LogicBuilderContext';
import styles from '../QlarrLogicBuilder.module.css';

export const OperatorSelector = React.memo(function OperatorSelector({ fieldCode, value, onChange, compact = false }) {
  const { getOperatorsForField, t } = useLogicBuilder();

  // Get operators available for this field
  const operators = fieldCode ? getOperatorsForField(fieldCode) : [];

  const handleChange = (event) => {
    onChange(event.target.value);
  };

  // Get the selected operator's label for the rendered value
  const selectedOperator = operators.find((op) => op.key === value);

  return (
    <FormControl
      className={compact ? undefined : styles.operatorSelector}
      size="small"
      disabled={!fieldCode || operators.length === 0}
      fullWidth
      variant="filled"
    >
      <Select
        value={value || ''}
        onChange={handleChange}
        displayEmpty
        variant="filled"
        renderValue={() =>
          selectedOperator
            ? t(selectedOperator.labelKey, { defaultValue: selectedOperator.displayLabel })
            : <Typography color="text.secondary">{t('logic_builder.select_operator')}</Typography>
        }
      >
        {operators.map((op) => (
          <MenuItem key={op.key} value={op.key}>
            <Box>
              <Typography variant="body2">
                {t(op.labelKey, { defaultValue: op.displayLabel })}
              </Typography>
              {!compact && op.descriptionKey && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {t(op.descriptionKey, { defaultValue: '' })}
                </Typography>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
});

OperatorSelector.propTypes = {
  fieldCode: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  compact: PropTypes.bool,
};
