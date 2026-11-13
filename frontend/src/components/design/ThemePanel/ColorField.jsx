import React from "react";
import { Check, Pencil } from "lucide-react";
import { CustomPicker } from "react-color";
import { Saturation } from "react-color/lib/components/common";
import styles from "./ThemePanel.module.css";
import {
  HEX_INPUT,
  alphaOf,
  fromRgb,
  hexOf,
  isLight,
  parseColor,
  sameColor,
} from "./colors";

const SaturationPointer = () => <span className={styles.satPointer} />;

/**
 * The picker itself: a shade area, the colour bar, and the transparency bar
 * directly under it.
 *
 * It is drawn in the panel rather than handed to `<input type="color">`,
 * which opens the operating system's own picker — one that looks nothing like
 * the panel around it and has no alpha channel at all. The two bars are range
 * inputs so they can be driven from the keyboard, which a drag area cannot.
 */
const PickerBody = ({ t, hsl, hsv, rgb, onChange }) => {
  const alpha = rgb.a === undefined ? 1 : rgb.a;
  return (
    <div className={styles.pickerStack}>
      <div className={styles.saturation}>
        <Saturation
          hsl={hsl}
          hsv={hsv}
          onChange={onChange}
          pointer={SaturationPointer}
        />
      </div>

      <input
        type="range"
        min={0}
        max={359}
        step={1}
        value={Math.round(hsl.h)}
        aria-label={t("theme_hue")}
        onChange={(event) =>
          onChange({
            h: Number(event.target.value),
            s: hsl.s,
            l: hsl.l,
            a: alpha,
          })
        }
        className={`${styles.bar} ${styles.hueBar}`}
      />

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(alpha * 100)}
        aria-label={t("theme_opacity")}
        aria-valuetext={`${Math.round(alpha * 100)}%`}
        // The bar is the colour itself fading out over a chequerboard, so its
        // left end reads as see-through rather than as white.
        style={{ "--alpha-color": fromRgb({ ...rgb, a: 1 }) }}
        onChange={(event) =>
          onChange({
            h: hsl.h,
            s: hsl.s,
            l: hsl.l,
            a: Number(event.target.value) / 100,
          })
        }
        className={`${styles.bar} ${styles.alphaBar}`}
      />
    </div>
  );
};

const SurveyColorPicker = CustomPicker(PickerBody);

/**
 * A colour setting: a row of named presets, and a custom editor behind the
 * last chip for anything else. The editor applies the picker immediately — the
 * survey next to it is the preview — while the typed hex waits for Apply or
 * Enter, so a half-typed value never repaints the survey.
 *
 * Opacity belongs to the colour rather than beside it: the transparency bar
 * sits under the colour bar, and a translucent colour is written as
 * `rgba(...)`, the notation the theme has always stored one in.
 */
function ColorField({ t, name, label, value, presets, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [invalid, setInvalid] = React.useState(false);

  const hex = hexOf(value);
  const alpha = alphaOf(value);
  const opacity = Math.round(alpha * 100);
  const current = (hex || value || "").toUpperCase();
  // The readout carries the opacity only once it has something to say: a fully
  // opaque colour is just its hex, the way every preset reads.
  const display = alpha < 1 ? `${current} · ${opacity}%` : current;
  const isCustom = !presets.some((preset) => sameColor(preset.value, value));
  // The picker holds alpha, which a hex string cannot carry, so it is fed the
  // parsed channels rather than the theme's notation.
  const pickerColor = parseColor(value) || { r: 0, g: 0, b: 0, a: 1 };

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
    // Typing a hex changes the colour, not how transparent it is — that is the
    // bar's to say, and leaving it be means Apply never undoes a drag.
    onChange(fromRgb({ ...parseColor(normalized), a: alpha }));
    // Applying a typed hex finishes the edit — the colour is on the survey and
    // the swatch row shows it, so the editor has nothing left to say.
    setOpen(false);
  };

  // A dragged picker carries the hex box with it, so the two never disagree.
  const picked = ({ rgb }) => {
    setDraft(fromRgb({ ...rgb, a: 1 }).toUpperCase());
    setInvalid(false);
    onChange(fromRgb(rgb));
  };

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
        <div
          className={styles.customEditor}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          <div className={styles.customRow}>
            <span
              aria-hidden="true"
              style={{ "--swatch-color": value }}
              className={styles.preview}
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
                }
              }}
              className={`${styles.hexInput} ${invalid ? styles.hexInvalid : ""}`}
            />
            <button type="button" onClick={apply} className={styles.apply}>
              {t("theme_apply")}
            </button>
          </div>

          <SurveyColorPicker t={t} color={pickerColor} onChange={picked} />

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
