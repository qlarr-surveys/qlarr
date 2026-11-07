import React from "react";
import { Check } from "lucide-react";
import styles from "./TranslationPanel.module.css";

/**
 * The box drawn inside a `role="checkbox"` button. It carries no state of its
 * own and is hidden from assistive technology, which reads `aria-checked` on
 * the button instead.
 */
function CheckBox({ checked, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.box} ${checked ? styles.boxOn : ""} ${className}`}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </span>
  );
}

export default React.memo(CheckBox);
