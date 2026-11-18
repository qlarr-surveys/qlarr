import React, {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
} from "react";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import styles from "./SetupFields.module.css";

/**
 * The rows of the settings panel, drawn to docs/design/editor-phase-3.3.html.
 *
 * One rule draws differently depending on where the panel puts it: smaller in
 * the general settings above "Show advanced settings" ("basic"), larger in an
 * advanced tab ("advanced"), and with the larger section titles of the Logic
 * tab ("logic"). The panel says which through SetupVariant, so a rule's
 * component only asks for a row and gets the right one.
 *
 * The class names are exported for controls a rule builds itself.
 */
export const SetupVariant = createContext("advanced");

export const useSetupVariant = () => useContext(SetupVariant);

export { styles as setupFieldStyles };

const cx = (...names) => names.filter(Boolean).join(" ");

const labelClassFor = (variant, field) => {
  if (variant === "basic") return field ? styles.basicFieldLabel : styles.basicLabel;
  if (variant === "logic") return styles.sectionLabel;
  return styles.label;
};

/**
 * Looks up a setting's help in the tooltips namespace. A setting without help
 * gets "" rather than its key, so it draws no ⓘ instead of one that reads
 * "image_height".
 */
export function useSetupHelp() {
  const { t } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);
  return useCallback((key) => t(key, { defaultValue: "" }), [t]);
}

/** The ⓘ before a setting's name; nothing when the setting has no help. */
export function SetupHelp({ label, help }) {
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  if (!help) {
    return null;
  }
  return (
    <span className={styles.help}>
      <CustomTooltip
        title={label}
        body={help}
        iconLabel={t("about_type", { name: label })}
        size="md"
      />
    </span>
  );
}

/** An on/off switch. `onChange` receives the new state. */
export function SetupSwitch({ checked, onChange, disabled, ...aria }) {
  const variant = useSetupVariant();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        styles.switch,
        variant === "basic" && styles.switchSmall,
        checked && styles.switchOn
      )}
      {...aria}
    >
      <span className={styles.knob} />
    </button>
  );
}

/**
 * A setting's name with its ⓘ, and whatever ends the line: a switch, buttons.
 * With `htmlFor` the name is the label of that control. `field` marks the name
 * of a control set under it, which the general settings print in small caps.
 */
export function SetupLabel({
  label,
  help,
  htmlFor,
  id,
  disabled,
  field,
  children,
}) {
  const variant = useSetupVariant();
  const Tag = htmlFor ? "label" : "span";
  return (
    <div className={cx(styles.inline, field && variant === "basic" && styles.inlineTight)}>
      <SetupHelp label={label} help={help} />
      <Tag
        id={id}
        htmlFor={htmlFor}
        className={cx(
          labelClassFor(variant, field),
          disabled && styles.labelDisabled
        )}
      >
        {label}
      </Tag>
      {children}
    </div>
  );
}

/**
 * A setting that is on or off: its name, then its switch. What the setting
 * opens up when it is on goes in `children`, under the line.
 */
export function SetupToggle({
  label,
  help,
  checked,
  onChange,
  disabled,
  switchLabel,
  children,
}) {
  const labelId = useId();
  return (
    <div>
      <SetupLabel label={label} help={help} id={labelId} disabled={disabled}>
        <SetupSwitch
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          aria-labelledby={switchLabel ? undefined : labelId}
          aria-label={switchLabel}
        />
      </SetupLabel>
      {children && <div className={styles.below}>{children}</div>}
    </div>
  );
}

/**
 * A setting whose control sits under its name: a select, an input, a list.
 * `action` ends the name's line, e.g. a button that acts on the whole field.
 */
export function SetupField({ label, help, htmlFor, id, action, children }) {
  const variant = useSetupVariant();
  return (
    <div>
      <div className={variant === "basic" ? styles.headTight : styles.head}>
        <SetupLabel label={label} help={help} htmlFor={htmlFor} id={id} field>
          {action}
        </SetupLabel>
      </div>
      {children}
    </div>
  );
}

/**
 * A native select with the design's chevron; compact in the general settings.
 * `inline` sizes it to sit inside a sentence ("Show [2] of 5").
 */
export function SetupSelect({ className, inline, children, ...props }) {
  const small = useSetupVariant() === "basic";
  return (
    <span className={cx(styles.selectWrap, inline && styles.selectWrapInline)}>
      <select
        className={cx(styles.select, small && styles.selectSmall, className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={small ? 14 : 16}
        strokeWidth={2}
        className={cx(styles.chevron, small && styles.chevronSmall)}
      />
    </span>
  );
}

/**
 * A square outlined button with an icon, e.g. Move up and Move down. The
 * icon is decoration; `label` is what it says.
 */
export function SetupIconButton({ label, icon: Icon, className, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(styles.iconButton, className)}
      {...props}
    >
      <Icon aria-hidden="true" size={16} strokeWidth={2} />
    </button>
  );
}

/**
 * One language's text of a translatable setting: the language's code, then
 * the input. `label` names the setting, for the input's accessible name.
 */
export function SetupLangInput({ lang, label, value, onChange, placeholder }) {
  return (
    <label className={styles.langInput}>
      <span className={styles.langCode} title={lang.name}>
        {lang.code.toUpperCase()}
      </span>
      <input
        type="text"
        dir="auto"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label ? `${label} (${lang.name})` : lang.name}
        className={styles.langField}
      />
    </label>
  );
}

/**
 * One choice of a few, as a row of buttons: a radio group, so the arrow keys
 * move the choice and Tab leaves the group. `columns` sets the buttons in that
 * many equal columns, taller, so long labels wrap instead of squeezing.
 */
export function SetupSegmented({
  label,
  labelledBy,
  options,
  value,
  onChange,
  columns,
  disabled,
}) {
  const buttons = useRef([]);
  const selected = options.findIndex((option) => option.value === value);

  const choose = (index) => {
    const count = options.length;
    const next = (index + count) % count;
    buttons.current[next]?.focus();
    if (options[next].value !== value) {
      onChange(options[next].value);
    }
  };

  const onKeyDown = (event, index) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next = null;
    if (event.key === forward || event.key === "ArrowDown") next = index + 1;
    else if (event.key === back || event.key === "ArrowUp") next = index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    if (next !== null) {
      event.preventDefault();
      choose(next);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cx(styles.segmented, columns && styles.segmentedGrid)}
      style={
        columns
          ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {options.map((option, index) => {
        const on = index === selected;
        return (
          <button
            key={String(option.value)}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (selected === -1 && index === 0) ? 0 : -1}
            disabled={disabled}
            onClick={() => !on && onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              styles.segment,
              columns && styles.segmentTall,
              on && styles.segmentOn
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A control inside a setting, e.g. Make repeatable's "Max repeats": a small
 * name over the control, so it reads as part of the setting above it.
 */
export function SetupSubField({ label, help, htmlFor, id, children }) {
  const Tag = htmlFor ? "label" : "span";
  return (
    <div className={styles.subField}>
      <div className={styles.subFieldHead}>
        <SetupHelp label={label} help={help} />
        <Tag id={id} htmlFor={htmlFor} className={styles.subFieldLabel}>
          {label}
        </Tag>
      </div>
      {children}
    </div>
  );
}

/**
 * A code with a fixed start the author can't change, e.g. a custom rule's
 * "validation_custom_": the start, then the input for the rest.
 */
export function SetupPrefixInput({ prefix, invalid, className, ...props }) {
  return (
    <span className={cx(styles.prefixInput, invalid && styles.invalid)}>
      <span aria-hidden="true" className={styles.prefixText}>
        {prefix}
      </span>
      <input
        type="text"
        dir="ltr"
        spellCheck={false}
        autoComplete="off"
        aria-invalid={!!invalid}
        className={cx(styles.prefixField, className)}
        {...props}
      />
    </span>
  );
}

/**
 * A switch inside a setting, e.g. a skip rule's "Disqualify": its name in
 * body type, then the switch. `onChange` receives the new state.
 */
export function SetupSubToggle({ label, checked, onChange, disabled }) {
  const labelId = useId();
  return (
    <div className={cx(styles.subToggle, disabled && styles.subToggleDisabled)}>
      <span id={labelId}>{label}</span>
      <SetupSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-labelledby={labelId}
      />
    </div>
  );
}

/** A list of things to tick, e.g. which options a new order applies to. */
export function SetupCheckList({ label, children }) {
  return (
    <ul aria-label={label} className={styles.checkList}>
      {children}
    </ul>
  );
}

/** One line of a SetupCheckList: the box, the item's code, its text. */
export function SetupCheckItem({ code, text, checked, onChange, note }) {
  return (
    <li>
      <label className={styles.checkItem}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className={styles.checkInput}
        />
        <span
          aria-hidden="true"
          className={cx(styles.checkBox, checked && styles.checkBoxOn)}
        >
          {checked && <Check size={14} strokeWidth={3} />}
        </span>
        {code && (
          <span className={styles.checkCode} title={code}>
            {code}
          </span>
        )}
        <span dir="auto" className={styles.checkText} title={text}>
          {text}
        </span>
        {note && <span className={styles.checkNote}>{note}</span>}
      </label>
    </li>
  );
}

/**
 * A boxed item of a list the author builds up, e.g. a skip rule: a header bar
 * with its title and actions, then its fields.
 */
export function SetupCard({ title, actions, invalid, children, ...rest }) {
  return (
    <section className={cx(styles.card, invalid && styles.cardInvalid)} {...rest}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{title}</span>
        {actions}
      </div>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}

/** The trash button that removes a card. */
export function SetupRemoveButton({ label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={styles.removeButton}
    >
      <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
    </button>
  );
}

/** The full-width button that adds to a list, e.g. "Add skip rule". */
export function SetupAddButton({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={cx(styles.addButton, className)}
      {...props}
    >
      <Plus aria-hidden="true" size={16} strokeWidth={2} />
      <span>{children}</span>
    </button>
  );
}

/** The small print under a control; `error` turns it into the error line. */
export function SetupHint({ id, error, children }) {
  return (
    <p
      id={id}
      role={error ? "alert" : undefined}
      className={cx(styles.hint, error && styles.hintError)}
    >
      {children}
    </p>
  );
}
