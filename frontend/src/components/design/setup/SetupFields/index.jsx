import React, { createContext, useCallback, useContext, useId } from "react";
import { ChevronDown } from "lucide-react";
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

/** A native select with the design's chevron; compact in the general settings. */
export function SetupSelect({ className, children, ...props }) {
  const small = useSetupVariant() === "basic";
  return (
    <span className={styles.selectWrap}>
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
