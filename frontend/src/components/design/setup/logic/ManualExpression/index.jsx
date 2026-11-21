import React, { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
  SetupConfirm,
  SetupHelp,
  SetupHint,
  setupFieldStyles,
} from "~/components/design/setup/SetupFields";
import styles from "./ManualExpression.module.css";

const cx = (...names) => names.filter(Boolean).join(" ");

/**
 * A rule written by hand instead of built from conditions, drawn to
 * docs/design/editor-phase-3.3.html (Logic tab, Show when): its name and ⓘ,
 * an × that goes back to the condition builder, and the expression.
 *
 * Going back erases the expression, so with something written the × asks
 * first; with nothing written it just goes back. `onClose` is the going back.
 */
export default function ManualExpression({
  help,
  value,
  onChange,
  placeholder,
  errors = [],
  onClose,
}) {
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const labelId = useId();
  const inputId = useId();
  const confirmId = useId();
  const closeRef = useRef(null);
  const [asking, setAsking] = useState(false);

  const label = t("manual_expression");
  const invalid = errors.length > 0;

  const askToClose = () => {
    if (!(value || "").trim()) {
      onClose();
      return;
    }
    setAsking(!asking);
  };

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={cx(styles.box, asking && styles.boxAsking)}
    >
      <div className={styles.head}>
        <SetupHelp label={label} help={help} />
        <label id={labelId} htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <button
          ref={closeRef}
          type="button"
          onClick={askToClose}
          aria-label={t("close_manual_expression")}
          title={t("close_manual_expression")}
          aria-expanded={asking}
          aria-controls={asking ? confirmId : undefined}
          className={styles.close}
        >
          <X aria-hidden="true" size={16} strokeWidth={2} />
        </button>
      </div>

      <textarea
        id={inputId}
        rows={3}
        dir="ltr"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        className={cx(
          setupFieldStyles.textarea,
          styles.expression,
          invalid && setupFieldStyles.invalid
        )}
      />

      {!asking &&
        errors.map((message, index) => (
          <SetupHint key={index} error>
            {message}
          </SetupHint>
        ))}

      {asking && (
        <SetupConfirm
          id={confirmId}
          message={t("switch_to_visual_warning")}
          confirmLabel={t("confirm_switch")}
          onCancel={() => {
            setAsking(false);
            closeRef.current?.focus();
          }}
          onConfirm={() => {
            setAsking(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
