import React, { useId } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import styles from "./SettingsFields.module.css";

/**
 * The building blocks of the Settings workspace's cards: a row per setting,
 * its label with an optional ⓘ, and the switch, select, input and buttons
 * drawn to docs/design/editor-phase-3.3.html.
 *
 * The class names are exported too, for controls a section has to build
 * itself (an input with its own validation, a button row).
 */
export { styles as fieldStyles };

export function SettingRow({ children }) {
  return <div className={styles.row}>{children}</div>;
}

function Help({ label, help }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  if (!help) {
    return null;
  }
  return (
    <CustomTooltip
      body={help}
      iconLabel={t("edit_survey.about_setting", { name: label })}
    />
  );
}

/** A setting's name, with its ⓘ when it has help, above the control. */
export function FieldHead({ label, help, htmlFor, id }) {
  return (
    <div className={styles.head}>
      <Help label={label} help={help} />
      {htmlFor ? (
        <label htmlFor={htmlFor} id={id} className={styles.label}>
          {label}
        </label>
      ) : (
        <span id={id} className={styles.label}>
          {label}
        </span>
      )}
    </div>
  );
}

/** An on/off switch. `onChange` receives the new state. */
export function Switch({ checked, onChange, disabled, ...aria }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`${styles.switch} ${checked ? styles.switchOn : ""}`}
      {...aria}
    >
      <span className={styles.knob} />
    </button>
  );
}

/** A setting that is only on or off: its label, then its switch. */
export function ToggleRow({ label, help, checked, onChange, disabled }) {
  const labelId = useId();
  return (
    <SettingRow>
      <div className={styles.inline}>
        <Help label={label} help={help} />
        <span id={labelId} className={styles.label}>
          {label}
        </span>
        <Switch
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          aria-labelledby={labelId}
        />
      </div>
    </SettingRow>
  );
}

/** A native select with the design's chevron. */
export function Select({ children, ...props }) {
  return (
    <span className={styles.selectWrap}>
      <select className={styles.select} {...props}>
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
