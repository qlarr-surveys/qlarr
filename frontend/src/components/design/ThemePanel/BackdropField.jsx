import React from "react";
import { BACKDROP_COLOR } from "@qlarr/design-core/constants/surveyTheme";
import ColorField from "./ColorField";
import styles from "./ThemePanel.module.css";
import { BACKDROP_COLORS } from "./constants";

/**
 * The wash laid over a background image.
 *
 * A photograph is chosen for how it looks, not for how text reads on it, and
 * the survey still has to be answerable — so rather than refuse the image or
 * dim it on the author's behalf, the panel offers the dimming as a setting
 * with none as its default. It only appears once there is an image to wash,
 * because a backdrop over a flat colour would just be a second flat colour.
 *
 * The section already carries a note of its own, and the preview beside the
 * panel answers "what does this do" the moment the chip is pressed, so this
 * says it with the switch rather than with a second paragraph under it.
 */
function BackdropField({ t, value, onChange }) {
  const on = Boolean(value);

  const labelOf = (option) =>
    option === "color"
      ? t("theme_background_type_color")
      : t("theme_background_none");

  const choose = (option) => {
    const next = option === "color";
    if (next === on) {
      return;
    }
    // Switching it on lands on a wash rather than on a colour to be picked:
    // the point is readable text, and the default already delivers that.
    onChange(next ? BACKDROP_COLOR : null);
  };

  return (
    <>
      <div className={styles.field}>
        <div className={styles.fieldHead}>
          <span className={styles.fieldLabel}>{t("theme_backdrop")}</span>
          <span className={styles.fieldValue}>
            {labelOf(on ? "color" : "none")}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label={t("theme_backdrop")}
          className={styles.chipGroup}
        >
          {["none", "color"].map((option) => {
            const selected = (option === "color") === on;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(option)}
                className={`${styles.chip} ${selected ? styles.chipOn : ""}`}
              >
                <span className={styles.chipLabel} data-label={labelOf(option)}>
                  {labelOf(option)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {on && (
        <ColorField
          t={t}
          name="backdrop"
          label={t("theme_backdrop_color")}
          value={value}
          presets={BACKDROP_COLORS}
          onChange={onChange}
        />
      )}
    </>
  );
}

export default React.memo(BackdropField);
