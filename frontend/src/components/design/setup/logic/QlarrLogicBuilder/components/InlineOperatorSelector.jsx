import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Typography, Box } from '@mui/material';
import { useLogicBuilder } from '../LogicBuilderContext';
import { InlineDropdown } from './InlineDropdown';

/**
 * InlineOperatorSelector - Operator selector using inline dropdown style
 * Displays selected operator as text, opens dropdown on click
 */
export const InlineOperatorSelector = React.memo(function InlineOperatorSelector({
  fieldCode,
  value,
  onChange,
}) {
  const { getOperatorsForField, t } = useLogicBuilder();

  // Get operators available for this field
  const operators = fieldCode ? getOperatorsForField(fieldCode) : [];

  // Transform operators to options format for InlineDropdown
  const options = useMemo(() => {
    return operators.map((op) => ({
      value: op.key,
      label: t(op.labelKey, { defaultValue: op.displayLabel }),
      description: op.descriptionKey
        ? t(op.descriptionKey, { defaultValue: '' })
        : undefined,
    }));
  }, [operators, t]);

  // Custom render for dropdown options (with description)
  const renderOption = (option) => (
    <Box>
      <Typography variant="body2">{option.label}</Typography>
      {option.description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {option.description}
        </Typography>
      )}
    </Box>
  );

  return (
    <InlineDropdown
      value={value}
      options={options}
      onChange={onChange}
      placeholder={t('logic_builder.select_operator')}
      noOptionsText={t('logic_builder.no_options')}
      disabled={!fieldCode || operators.length === 0}
      renderOption={renderOption}
    />
  );
});

InlineOperatorSelector.propTypes = {
  fieldCode: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
