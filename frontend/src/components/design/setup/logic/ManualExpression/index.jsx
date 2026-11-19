import React, { useEffect, useId, useRef, useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
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
  const confirmTextId = useId();
  const closeRef = useRef(null);
  const cancelRef = useRef(null);
  const inputRef = useRef(null);
  const [asking, setAsking] = useState(false);

  const label = t("manual_expression");
  const invalid = errors.length > 0;

  useEffect(() => {
    if (asking) cancelRef.current?.focus();
  }, [asking]);

  const askToClose = () => {
    if (!(value || "").trim()) {
      onClose();
      return;
    }
    setAsking(!asking);
  };

  const cancel = (focus) => {
    setAsking(false);
    focus?.current?.focus();
  };

  const onConfirmKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel(closeRef);
    }
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
        ref={inputRef}
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
        <div
          id={confirmId}
          role="alertdialog"
          aria-labelledby={confirmTextId}
          onKeyDown={onConfirmKeyDown}
          className={styles.confirm}
        >
          <p id={confirmTextId} className={styles.confirmText}>
            <TriangleAlert
              aria-hidden="true"
              size={16}
              strokeWidth={2}
              className={styles.confirmIcon}
            />
            {t("switch_to_visual_warning")}
          </p>
          <div className={styles.confirmActions}>
            <button
              ref={cancelRef}
              type="button"
              onClick={() => cancel(inputRef)}
              className={styles.cancel}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                setAsking(false);
                onClose();
              }}
              className={styles.confirmButton}
            >
              {t("confirm_switch")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
