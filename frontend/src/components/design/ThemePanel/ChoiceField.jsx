import React from "react";
import { ChevronDown } from "lucide-react";
import styles from "./ThemePanel.module.css";

/**
 * A setting with a handful of recommended values as chips, and the long tail
 * behind a select. Whatever the current value is, one of the two shows it as
 * selected, so a value outside the chips never looks unset.
 *
 * That includes a value neither list carries. The panel before this one
 * offered every text size from 10 to 32 in steps of two, so a survey can hold
 * an answer size of 24 or a title size of 12 that the lists here never name.
 * Such a value gets a row of its own in the select rather than leaving it on
 * its placeholder as if nothing were set.
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
  // Compared as text: a value can arrive as "24" from a survey written
  // elsewhere, and it is still the 24 chip.
  const same = (a, b) => String(a) === String(b);
  const inChips = options.some((option) => same(option, value));
  const offList =
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !inChips &&
    !moreOptions.some((option) => same(option, value));
  const selectOptions = offList ? withValue(moreOptions, value) : moreOptions;
  const inMore = !inChips && selectOptions.some((option) => same(option, value));

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
              aria-checked={same(option, value)}
              onClick={() => onChange(option)}
              className={`${styles.chip} ${same(option, value) ? styles.chipOn : ""}`}
            >
              <span className={styles.chipLabel} data-label={option}>
                {option}
              </span>
            </button>
          ))}
        </div>
        <span className={`${styles.moreWrap} ${inMore ? styles.moreOn : ""}`}>
          <select
            aria-label={moreLabel}
            value={inMore ? String(value) : ""}
            onChange={(event) => {
              // The placeholder row only labels the select; picking it is not a
              // choice of its own.
              if (event.target.value === "") return;
              onChange(parseOption(event.target.value, value));
            }}
            className={styles.more}
          >
            <option value="">{moreLabel}</option>
            {selectOptions.map((option) => (
              <option key={option} value={String(option)}>
                {unit ? `${option} ${unit}` : option}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            size={12}
            strokeWidth={2}
            className={styles.moreChevron}
          />
        </span>
      </div>
    </div>
  );
}

// The list with a value it does not carry slotted in: in order among numbers,
// so a size sits where a size would, and at the end of anything else.
function withValue(list, value) {
  const all = [...list, value];
  return all.every((item) => typeof item === "number")
    ? all.sort((a, b) => a - b)
    : all;
}

// A select hands back strings; sizes have to go into the theme as numbers, so
// the current value decides which of the two this field deals in.
function parseOption(raw, current) {
  return typeof current === "number" ? Number(raw) : raw;
}

export default React.memo(ChoiceField);
