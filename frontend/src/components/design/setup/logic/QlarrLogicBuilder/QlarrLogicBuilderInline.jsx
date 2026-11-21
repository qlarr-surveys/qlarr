import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Plus, X } from 'lucide-react';
import { setupFieldStyles } from '~/components/design/setup/SetupFields';
import { useLogicBuilder } from './LogicBuilderContext';
import { InlineFieldSelector } from './components/InlineFieldSelector';
import { InlineOperatorSelector } from './components/InlineOperatorSelector';
import { ValueInput } from './components/ValueInput';
import { OPERATORS } from '@qlarr/design-core/logic/operators';
import { isRuleValid } from '@qlarr/design-core/logic/jsonLogic';
import { SELECT_FIELD_TYPES } from './config/constants';
import styles from './QlarrLogicBuilderInline.module.css';

const cx = (...names) => names.filter(Boolean).join(' ');

/**
 * The conditions of a rule, drawn to docs/design/editor-phase-3.3.html (Logic
 * tab, Show when): a card per condition (its field, rule and value), "<lead>
 * [All | Any] conditions are met" once there are two, and Add condition.
 *
 * - `lead` starts that sentence, e.g. "Show when"; "When" by default.
 * - `onManual` lets the author write an expression instead: Add condition
 *   then asks how for the first condition, and a link offers it after.
 * - `firstRule` is what the first condition starts from, e.g. a field
 *   already chosen; a later one starts blank, with its field list open.
 * - `emptyState` shows "No conditions defined" while there are none.
 */
export function QlarrLogicBuilderInline({ lead, emptyState = true, onManual, firstRule }) {
  const { state, dispatch, getFieldDefinition, t } = useLogicBuilder();
  const { tree } = state;
  const conditions = tree.children;
  const addRef = useRef(null);

  const addCondition = () => {
    dispatch({
      type: 'ADD_RULE',
      rule: conditions.length === 0 && firstRule ? firstRule : { openField: true },
    });
  };

  const removeCondition = (ruleId) => {
    dispatch({ type: 'REMOVE_RULE', ruleId });
    addRef.current?.focus();
  };

  const changeField = (ruleId, fieldCode) => {
    // One dispatch for field, operator and value, so no half-set rule is saved
    const fieldDef = getFieldDefinition(fieldCode);
    dispatch({
      type: 'UPDATE_FIELD_WITH_DEFAULTS',
      ruleId,
      field: fieldCode,
      operator: fieldDef?.defaultOperator || null,
      value: null,
    });
  };

  const changeOperator = (ruleId, operator) => {
    dispatch({ type: 'UPDATE_OPERATOR', ruleId, operator });
    // A rule without a value drops the old one
    if (OPERATORS[operator]?.cardinality === 0) {
      dispatch({ type: 'UPDATE_VALUE', ruleId, value: null });
    }
  };

  // What a condition still needs before it counts, as the line under it
  const hintFor = (rule) => {
    const field = rule.field ? getFieldDefinition(rule.field) : undefined;
    if (!field) return t('logic_builder.choose_field');
    const operator = OPERATORS[rule.operator];
    if (!operator) return t('logic_builder.choose_rule');
    if (isRuleValid(rule)) return null;
    if (operator.cardinality === 2) {
      const filled =
        Array.isArray(rule.value) &&
        rule.value.length === 2 &&
        rule.value.every((v) => v !== null && v !== undefined && v !== '');
      // A filled range that runs backwards: the range input says why
      return filled ? null : t('logic_builder.enter_value');
    }
    return SELECT_FIELD_TYPES.includes(field.type)
      ? t('logic_builder.choose_answer')
      : t('logic_builder.enter_value');
  };

  return (
    <div className={styles.builder}>
      {conditions.length === 0 ? (
        emptyState && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>{t('logic_builder.empty_state_title')}</p>
            <p className={styles.emptyHint}>{t('logic_builder.empty_state_hint')}</p>
          </div>
        )
      ) : (
        <>
          {conditions.length > 1 && (
            <div className={styles.match}>
              <span>{lead || t('logic_builder.when')}</span>
              <JoinChoice
                value={tree.conjunction}
                onChange={(conjunction) =>
                  dispatch({ type: 'UPDATE_CONJUNCTION', conjunction })
                }
                t={t}
              />
              <span>{t('logic_builder.conditions_are_met')}</span>
            </div>
          )}
          <ol className={styles.list} aria-label={t('logic_builder.conditions')}>
            {conditions.map((rule, index) => (
              <Condition
                key={rule.id}
                rule={rule}
                n={index + 1}
                hint={hintFor(rule)}
                complete={!!rule.field && !!getFieldDefinition(rule.field) && isRuleValid(rule)}
                onField={(fieldCode) => changeField(rule.id, fieldCode)}
                onOperator={(operator) => changeOperator(rule.id, operator)}
                onValue={(value) => dispatch({ type: 'UPDATE_VALUE', ruleId: rule.id, value })}
                onRemove={() => removeCondition(rule.id)}
                t={t}
              />
            ))}
          </ol>
        </>
      )}

      <AddCondition
        ref={addRef}
        asks={!!onManual && conditions.length === 0}
        onAdd={addCondition}
        onManual={onManual}
        t={t}
      />

      {onManual && conditions.length > 0 && (
        <button
          type="button"
          onClick={onManual}
          className={cx(setupFieldStyles.textLink, styles.manualLink)}
        >
          {t('use_manual_expression')}
        </button>
      )}
    </div>
  );
}

/** One condition: field, rule, value, what it still needs, and its ×. */
function Condition({ rule, n, hint, complete, onField, onOperator, onValue, onRemove, t }) {
  const operatorDef = rule.operator ? OPERATORS[rule.operator] : undefined;
  const showValue = !!rule.field && operatorDef?.cardinality > 0;

  return (
    <li
      aria-label={t('logic_builder.condition_n', { n })}
      className={cx(styles.condition, !complete && styles.conditionIncomplete)}
    >
      <div className={styles.fields}>
        <InlineFieldSelector
          value={rule.field}
          onChange={onField}
          ariaLabel={t('logic_builder.field_for_condition', { n })}
          defaultOpen={!!rule.openField && !rule.field}
        />
        {rule.field && (
          <InlineOperatorSelector
            fieldCode={rule.field}
            value={rule.operator}
            onChange={onOperator}
            ariaLabel={t('logic_builder.rule_for_condition', { n })}
          />
        )}
        {showValue && (
          <div className={styles.value}>
            <ValueInput
              fieldCode={rule.field}
              operator={rule.operator}
              value={rule.value}
              onChange={onValue}
              autoOpen={rule.autoOpen}
              compact
            />
          </div>
        )}
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('logic_builder.remove_condition_n', { n })}
        title={t('logic_builder.remove_condition')}
        className={styles.remove}
      >
        <X aria-hidden="true" size={16} strokeWidth={2} />
      </button>
    </li>
  );
}

/** All or Any, as two buttons in a pill: a radio group for the arrow keys. */
function JoinChoice({ value, onChange, t }) {
  const buttons = useRef([]);
  const options = [
    { value: 'and', label: t('logic_builder.match_all') },
    { value: 'or', label: t('logic_builder.match_any') },
  ];
  const selected = options.findIndex((option) => option.value === value);

  const onKeyDown = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    // Two choices: any arrow moves to the other one
    event.preventDefault();
    const next = (index + 1) % options.length;
    buttons.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <span role="radiogroup" aria-label={t('logic_builder.match')} className={styles.join}>
      {options.map((option, index) => {
        const on = index === selected;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (selected === -1 && index === 0) ? 0 : -1}
            onClick={() => !on && onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(styles.joinOption, on && styles.joinOptionOn)}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}

/**
 * Add condition. With `asks`, it first asks how: from lists (the condition
 * builder) or as a manual expression.
 */
const AddCondition = forwardRef(function AddCondition({ asks, onAdd, onManual, t }, ref) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const items = useRef([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    items.current[0]?.focus();
    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // The question goes away with the last condition's removal, and so does
  // the answer to it
  useEffect(() => {
    if (!asks) setOpen(false);
  }, [asks]);

  const onMenuKeyDown = (event) => {
    const list = items.current.filter(Boolean);
    const at = list.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      ref.current?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      (list[at + 1] || list[0])?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      (list[at - 1] || list[list.length - 1])?.focus();
    }
  };

  const modes = [
    {
      key: 'builder',
      icon: '≡',
      name: t('logic_builder.builder_mode'),
      description: t('logic_builder.builder_mode_desc'),
      current: true,
      pick: onAdd,
    },
    {
      key: 'manual',
      icon: 'ƒx',
      name: t('logic_builder.manual_mode'),
      description: t('logic_builder.manual_mode_desc'),
      current: false,
      pick: onManual,
    },
  ];

  return (
    <div ref={wrapRef} className={styles.add}>
      <button
        ref={ref}
        type="button"
        aria-haspopup={asks ? 'menu' : undefined}
        aria-expanded={asks ? open : undefined}
        aria-controls={asks && open ? menuId : undefined}
        onClick={() => (asks ? setOpen(!open) : onAdd())}
        className={setupFieldStyles.addButton}
      >
        <Plus aria-hidden="true" size={16} strokeWidth={2} />
        <span>{t('logic_builder.add_condition')}</span>
      </button>
      {asks && open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('logic_builder.add_how_label')}
          onKeyDown={onMenuKeyDown}
          className={styles.menu}
        >
          <p className={styles.menuTitle}>{t('logic_builder.add_how')}</p>
          {modes.map((mode, index) => (
            <button
              key={mode.key}
              ref={(element) => {
                items.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={mode.current}
              onClick={() => {
                setOpen(false);
                mode.pick();
              }}
              className={cx(styles.menuItem, mode.current && styles.menuItemCurrent)}
            >
              <span aria-hidden="true" className={styles.menuIcon}>
                {mode.icon}
              </span>
              <span className={styles.menuText}>
                <span className={styles.menuName}>
                  {mode.name}
                  {mode.current && (
                    <span className={styles.menuBadge}>{t('logic_builder.current')}</span>
                  )}
                </span>
                <span className={styles.menuDescription}>{mode.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

QlarrLogicBuilderInline.propTypes = {
  lead: PropTypes.string,
  emptyState: PropTypes.bool,
  onManual: PropTypes.func,
  firstRule: PropTypes.object,
};
