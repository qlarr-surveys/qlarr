import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@mui/material';
import { useLogicBuilder } from '../LogicBuilderContext';
import { InlineDropdown } from './InlineDropdown';

/**
 * InlineFieldSelector - Field selector using inline dropdown style
 * Displays selected field as text, opens dropdown on click
 */
export const InlineFieldSelector = React.memo(function InlineFieldSelector({
  value,
  onChange,
}) {
  const { fields, t } = useLogicBuilder();

  // Transform fields to options format for InlineDropdown
  const options = useMemo(() => {
    return fields.map((f) => ({
      value: f.code,
      label: f.label
        .replace(/\s*-\s*(\d+)/, '-$1')  // Normalize " - 2" to "-2"
        .replace(/\s*-\s*$/, '')         // Remove trailing dash without number
        .trim(),
      code: f.code,
    }));
  }, [fields]);

  // Custom render for display text (shows field label, falls back to code)
  const renderValue = (option) => {
    return option.label || option.code;
  };

  // Custom render for dropdown options
  const renderOption = (option) => (
    <Typography
      variant="body2"
      sx={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {option.label || option.code}
    </Typography>
  );

  return (
    <InlineDropdown
      value={value}
      options={options}
      onChange={onChange}
      placeholder={t('logic_builder.select_field')}
      searchPlaceholder={t('logic_builder.search')}
      noOptionsText={t('logic_builder.no_options')}
      searchable
      renderValue={renderValue}
      renderOption={renderOption}
    />
  );
});

InlineFieldSelector.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
