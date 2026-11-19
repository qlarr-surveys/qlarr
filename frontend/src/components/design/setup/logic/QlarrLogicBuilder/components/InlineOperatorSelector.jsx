import React from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import { useLogicBuilder } from '../LogicBuilderContext';
import styles from '../QlarrLogicBuilderInline.module.css';

/**
 * InlineOperatorSelector - a condition's rule ("Is", "Includes", "Is
 * answered"), as a native select drawn flat inside the condition's card.
 * A rule the field doesn't offer reads as unset rather than as another one.
 */
export const InlineOperatorSelector = React.memo(function InlineOperatorSelector({
  fieldCode,
  value,
  onChange,
  ariaLabel,
}) {
  const { getOperatorsForField, t } = useLogicBuilder();

  const operators = fieldCode ? getOperatorsForField(fieldCode) : [];
  const known = operators.some((op) => op.key === value);

  return (
    <span className={styles.selectWrap}>
      <select
        aria-label={ariaLabel}
        value={known ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={operators.length === 0}
        className={styles.select}
      >
        {!known && (
          <option value="" disabled>
            {t('logic_builder.select_operator')}
          </option>
        )}
        {operators.map((op) => (
          <option key={op.key} value={op.key}>
            {t(op.labelKey, { defaultValue: op.displayLabel })}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={16}
        strokeWidth={2}
        className={styles.selectChevron}
      />
    </span>
  );
});

InlineOperatorSelector.propTypes = {
  fieldCode: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string,
};
