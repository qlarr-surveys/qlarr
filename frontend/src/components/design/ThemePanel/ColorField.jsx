import React from "react";
import { Check, Pencil } from "lucide-react";
import styles from "./ThemePanel.module.css";
import { HEX_INPUT, isLight, sameColor, toHex, toPickerValue } from "./colors";

/**
 * A colour setting: a row of named presets, and a custom editor behind the
 * last chip for anything else. The editor applies the picker immediately — the
 * survey next to it is the preview — while the typed hex waits for Apply or
 * Enter, so a half-typed value never repaints the survey.
 */
function ColorField({ t, name, label, value, presets, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [invalid, setInvalid] = React.useState(false);

  const hex = toHex(value);
  const current = (hex || value || "").toUpperCase();
  const isCustom = !presets.some((preset) => sameColor(preset.value, value));
  // Keyed by the theme field, not the label: a translated label can be all
  // non-latin characters, and every field would collapse to the same id.
  const hexId = `theme-hex-${name}`;
  const helpId = `${hexId}-help`;

  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) {
        setDraft(current);
        setInvalid(false);
      }
      return !wasOpen;
    });
  };

  const apply = () => {
    const candidate = draft.trim();
    if (!HEX_INPUT.test(candidate)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    const normalized = candidate.startsWith("#") ? candidate : `#${candidate}`;
    onChange(normalized.toLowerCase());
    // Applying a typed hex finishes the edit — the colour is on the survey and
    // the swatch row shows it, so the editor has nothing left to say.
    setOpen(false);
  };

  const pick = (preset) => {
    setOpen(false);
    onChange(preset.value);
  };

  return (
    <div className={styles.field}>
      <div className={styles.fieldHead}>
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.fieldValue}>{current}</span>
      </div>

      <div role="radiogroup" aria-label={label} className={styles.swatches}>
        {presets.map((preset) => {
          const selected = sameColor(preset.value, value);
          return (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={t(preset.labelKey)}
              title={t(preset.labelKey)}
              onClick={() => pick(preset)}
              style={{ background: preset.value }}
              className={`${styles.swatch} ${selected ? styles.swatchOn : ""}`}
            >
              {selected && (
                <Check
                  size={13}
                  strokeWidth={3}
                  aria-hidden="true"
                  color={isLight(preset.value) ? "#0e1338" : "#ffffff"}
                />
              )}
            </button>
          );
        })}

        <button
          type="button"
          role="radio"
          aria-checked={isCustom}
          aria-expanded={open}
          onClick={toggle}
          className={`${styles.customChip} ${isCustom ? styles.customChipOn : ""}`}
        >
          <Pencil size={12} strokeWidth={1.75} aria-hidden="true" />
          <span
            className={styles.chipLabel}
            data-label={t("theme_custom_color")}
          >
            {t("theme_custom_color")}
          </span>
        </button>
      </div>

      {open && (
        <div className={styles.customEditor}>
          <div className={styles.customRow}>
            <input
              type="color"
              aria-label={t("theme_custom_color")}
              value={toPickerValue(draft, value)}
              onChange={(event) => {
                setDraft(event.target.value.toUpperCase());
                setInvalid(false);
                onChange(event.target.value.toLowerCase());
              }}
              className={styles.picker}
            />
            <input
              id={hexId}
              type="text"
              value={draft}
              spellCheck={false}
              aria-label={label}
              aria-invalid={invalid}
              aria-describedby={helpId}
              onChange={(event) => {
                setDraft(event.target.value);
                setInvalid(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  apply();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                }
              }}
              className={`${styles.hexInput} ${invalid ? styles.hexInvalid : ""}`}
            />
            <button type="button" onClick={apply} className={styles.apply}>
              {t("theme_apply")}
            </button>
          </div>
          <p
            id={helpId}
            role={invalid ? "alert" : "status"}
            className={`${styles.help} ${invalid ? styles.helpError : ""}`}
          >
            {invalid ? t("theme_custom_hex_invalid") : t("theme_custom_hex_hint")}
          </p>
        </div>
      )}
    </div>
  );
}

export default React.memo(ColorField);
