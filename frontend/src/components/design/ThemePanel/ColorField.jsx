import React from "react";
import { Check, Pencil } from "lucide-react";
import { ChromePicker } from "react-color";
import styles from "./ThemePanel.module.css";
import {
  alphaOf,
  fromRgb,
  hexOf,
  isLight,
  parseColor,
  sameColor,
} from "./colors";

// The picker is drawn inside a 300px panel, so it gives up its own card and
// takes the width it is given; the rest keeps it on the panel's typography.
const PICKER_STYLES = {
  default: {
    picker: {
      width: "100%",
      boxShadow: "none",
      borderRadius: 0,
      background: "transparent",
      fontFamily: "Rubik, sans-serif",
    },
    body: { padding: "10px 0 0" },
  },
};

/**
 * A colour setting: a row of named presets, and a custom editor behind the
 * last chip for anything else.
 *
 * The custom editor is a full picker — saturation, hue and opacity, with hex
 * and RGBA boxes under them — rather than `<input type="color">`, which hands
 * the job to the operating system and has no alpha channel at all. Opacity is
 * part of a colour here: a translucent survey background is written as
 * `rgba(...)`, the way the theme has always stored one.
 *
 * Every move applies immediately — the survey next to the panel is the
 * preview — and the picker's own hex box only commits a value once it parses,
 * so a half-typed hex never repaints the survey.
 */
function ColorField({ t, name, label, value, presets, onChange }) {
  const [open, setOpen] = React.useState(false);

  const hex = hexOf(value);
  const alpha = alphaOf(value);
  const opacity = Math.round(alpha * 100);
  const current = (hex || value || "").toUpperCase();
  // The readout carries the opacity only once it has something to say: a fully
  // opaque colour is just its hex, the way every preset reads.
  const display = alpha < 1 ? `${current} · ${opacity}%` : current;
  const isCustom = !presets.some((preset) => sameColor(preset.value, value));

  // The picker holds alpha, which a hex string cannot carry, so it is fed the
  // parsed channels instead of the theme's notation.
  const pickerColor = parseColor(value) || { r: 0, g: 0, b: 0, a: 1 };

  const pick = (preset) => {
    setOpen(false);
    onChange(preset.value);
  };

  return (
    <div className={styles.field}>
      <div className={styles.fieldHead}>
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.fieldValue}>{display}</span>
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
          onClick={() => setOpen((wasOpen) => !wasOpen)}
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
        <div
          role="group"
          aria-label={`${label} — ${t("theme_custom_color")}`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            }
          }}
          className={styles.customEditor}
        >
          <ChromePicker
            color={pickerColor}
            styles={PICKER_STYLES}
            onChange={({ rgb }) => onChange(fromRgb(rgb))}
          />
          <p id={`theme-hex-${name}-help`} className={styles.help}>
            {t("theme_custom_hex_hint")}
          </p>
        </div>
      )}
    </div>
  );
}

export default React.memo(ColorField);
