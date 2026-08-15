import React from 'react';
import PropTypes from 'prop-types';
import { Autocomplete, TextField, Typography, Box } from '@mui/material';
import { useLogicBuilder } from '../LogicBuilderContext';
import styles from '../QlarrLogicBuilder.module.css';
import TextMaxLine from '~/components/text-max-line';

export const FieldSelector = React.memo(function FieldSelector({ value, onChange, compact = false }) {
  const { fields, t } = useLogicBuilder();

  const selectedField = value
    ? fields.find((f) => f.code === value) || null
    : null;

  const handleChange = (_event, newValue) => {
    if (newValue) {
      onChange(newValue.code);
    }
  };

  return (
    <Autocomplete
      className={compact ? undefined : styles.fieldSelector}
      noOptionsText={t('logic_builder.no_options')}
      options={fields}
      value={selectedField}
      onChange={handleChange}
      getOptionLabel={(option) => {
        const labelWithoutNumber = option.label.replace(/^\d+\.\s*/, '');
        return `${option.code} - ${labelWithoutNumber}`;
      }}
      isOptionEqualToValue={(option, val) => option.code === val.code}
      groupBy={(option) => option.group || ''}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={t('logic_builder.select_field')}
          size="small"
          variant="filled"
        />
      )}
      renderGroup={(params) => (
        <li key={params.key}>
          <Typography
            variant="overline"
            sx={{
              px: 2,
              py: 0.5,
              display: 'block',
              color: 'text.secondary',
              backgroundColor: 'grey.50',
              fontWeight: 600,
            }}
          >
            {params.group}
          </Typography>
          <Box component="ul" sx={{ p: 0 }}>
            {params.children}
          </Box>
        </li>
      )}
      renderOption={(props, option) => {
        const labelWithoutNumber = option.label.replace(/^\d+\.\s*/, '');
        return (
          <li key={option.code} {...props}>
            <TextMaxLine line={2} variant="body2">
              {`${labelWithoutNumber}`}
            </TextMaxLine>
          </li>
        );
      }}
      size="small"
      disableClearable={false}
      openOnFocus
      fullWidth
    />
  );
});

FieldSelector.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  compact: PropTypes.bool,
};
