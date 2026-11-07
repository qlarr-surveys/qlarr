import React from "react";
import styles from "./ThemePanel.module.css";

/**
 * A setting with a handful of recommended values as chips, and the long tail
 * behind a select. The select shows the current value when it holds one, so a
 * value outside the chips never looks unset.
 */
function ChoiceField({
  label,
  current,
  value,
  options,
  moreOptions,
  moreLabel,
  onChange,
  unit,
}) {
  const inMore = moreOptions.some((option) => option === value);

  return (
    <div className={styles.field}>
      <div className={styles.fieldHead}>
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.fieldValue}>{current}</span>
      </div>
      <div className={styles.chips}>
        <div role="radiogroup" aria-label={label} className={styles.chipGroup}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === value}
              onClick={() => onChange(option)}
              className={`${styles.chip} ${option === value ? styles.chipOn : ""}`}
            >
              {option}
            </button>
          ))}
        </div>
        <select
          aria-label={moreLabel}
          value={inMore ? String(value) : ""}
          onChange={(event) => {
            // The placeholder row only labels the select; picking it is not a
            // choice of its own.
            if (event.target.value === "") return;
            onChange(parseOption(event.target.value, value));
          }}
          className={`${styles.more} ${inMore ? styles.moreOn : ""}`}
        >
          <option value="">{moreLabel}</option>
          {moreOptions.map((option) => (
            <option key={option} value={String(option)}>
              {unit ? `${option} ${unit}` : option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// A select hands back strings; sizes have to go into the theme as numbers, so
// the current value decides which of the two this field deals in.
function parseOption(raw, current) {
  return typeof current === "number" ? Number(raw) : raw;
}

export default React.memo(ChoiceField);
