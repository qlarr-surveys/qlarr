import React, { createContext, useContext, useId } from "react";
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

const labelClassFor = (variant) => {
  if (variant === "basic") return styles.basicLabel;
  if (variant === "logic") return styles.sectionLabel;
  return styles.label;
};

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
 * With `htmlFor` the name is the label of that control.
 */
export function SetupLabel({ label, help, htmlFor, id, disabled, children }) {
  const variant = useSetupVariant();
  const Tag = htmlFor ? "label" : "span";
  return (
    <div className={styles.inline}>
      <SetupHelp label={label} help={help} />
      <Tag
        id={id}
        htmlFor={htmlFor}
        className={cx(labelClassFor(variant), disabled && styles.labelDisabled)}
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
  return (
    <div>
      <div className={styles.head}>
        <SetupLabel label={label} help={help} htmlFor={htmlFor} id={id}>
          {action}
        </SetupLabel>
      </div>
      {children}
    </div>
  );
}

/** A native select with the design's chevron. */
export function SetupSelect({ className, children, ...props }) {
  return (
    <span className={styles.selectWrap}>
      <select className={cx(styles.select, className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={16}
        strokeWidth={2}
        className={styles.chevron}
      />
    </span>
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
