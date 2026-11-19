import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLogicBuilder } from '../LogicBuilderContext';
import { InlineDropdown } from './InlineDropdown';
import styles from '../QlarrLogicBuilderInline.module.css';

/**
 * InlineFieldSelector - a condition's field: what the condition looks at.
 * The list shows a question's or a page's code first, then its text, so a
 * long title doesn't push the code out of sight.
 */
export const InlineFieldSelector = React.memo(function InlineFieldSelector({
  value,
  onChange,
  ariaLabel,
  defaultOpen,
}) {
  const { fields, t } = useLogicBuilder();

  const options = useMemo(() => {
    return fields.map((f) => {
      const label = f.label
        .replace(/\s*-\s*(\d+)/, '-$1') // Normalize " - 2" to "-2"
        .replace(/\s*-\s*$/, '') // Remove trailing dash without number
        .trim();
      // "Q2. Which plan are you on?" lists as "Q2." and its text
      const prefix = f.numericCode ? `${f.numericCode}. ` : '';
      const split = prefix && label.startsWith(prefix);
      return {
        value: f.code,
        label: label || f.code,
        code: f.code,
        lead: split ? prefix.trim() : null,
        text: split ? label.slice(prefix.length) : label || f.code,
      };
    });
  }, [fields]);

  const renderOption = (option) =>
    option.lead ? (
      <span className={styles.fieldOption}>
        <span className={styles.fieldOptionCode}>{option.lead}</span>
        <span className={styles.fieldOptionText}>{option.text}</span>
      </span>
    ) : (
      <span className={styles.fieldOption}>
        <span className={styles.fieldOptionName}>{option.text}</span>
      </span>
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
      renderOption={renderOption}
      ariaLabel={ariaLabel}
      defaultOpen={defaultOpen}
    />
  );
});

InlineFieldSelector.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string,
  defaultOpen: PropTypes.bool,
};
