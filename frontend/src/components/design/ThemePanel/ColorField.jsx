import React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown, Pencil, Pipette } from "lucide-react";
import { CustomPicker } from "react-color";
import { Saturation } from "react-color/lib/components/common";
import { isSessionRtl } from "~/utils/common";
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

// The gap between the swatch and the popup, and how close to the window edge
// the popup may sit before it is pushed back in.
const GAP = 6;
const EDGE = 8;

const SaturationPointer = () => <span className={styles.satPointer} />;

// The browser's own screen sampler. Chromium has it; Firefox and Safari do
// not, and there the button simply is not offered.
const hasEyedropper = typeof window !== "undefined" && "EyeDropper" in window;

const digits = (raw) => raw.replace(/[^0-9]/g, "");

/**
 * The picker: a shade area, then the sampler and the current colour beside the
 * colour bar and the transparency bar, then the channels as numbers.
 *
 * It is drawn here rather than handed to `<input type="color">`, which opens
 * the operating system's own picker — one that looks nothing like the panel
 * around it and has no alpha channel at all. The bars and the number boxes are
 * ordinary inputs, so unlike a drag area they answer to the keyboard.
 */
const PickerBody = ({ t, hsl, hsv, rgb, onChange, suppressCloseRef }) => {
  const [asHsl, setAsHsl] = React.useState(false);
  // A channel being typed into holds its own text, so a box can be emptied and
  // retyped without the colour lurching to whatever the half-typed number is.
  const [drafts, setDrafts] = React.useState({});

  const alpha = rgb.a === undefined ? 1 : rgb.a;
  const channels = asHsl
    ? [
        { key: "h", name: "H", value: Math.round(hsl.h), max: 359 },
        { key: "s", name: "S", value: Math.round(hsl.s * 100), max: 100 },
        { key: "l", name: "L", value: Math.round(hsl.l * 100), max: 100 },
      ]
    : [
        { key: "r", name: "R", value: Math.round(rgb.r), max: 255 },
        { key: "g", name: "G", value: Math.round(rgb.g), max: 255 },
        { key: "b", name: "B", value: Math.round(rgb.b), max: 255 },
      ];

  const setChannel = (channel, raw) => {
    const text = digits(raw).slice(0, 3);
    setDrafts((current) => ({ ...current, [channel.key]: text }));
    if (text === "") {
      return;
    }
    const number = Math.min(Number(text), channel.max);
    onChange(
      asHsl
        ? {
            h: hsl.h,
            s: hsl.s,
            l: hsl.l,
            a: alpha,
            [channel.key]: channel.key === "h" ? number : number / 100,
          }
        : { r: rgb.r, g: rgb.g, b: rgb.b, a: alpha, [channel.key]: number }
    );
  };

  const sampleScreen = async () => {
    // The sampler takes over the screen; a click out there must not be read as
    // a click away from the popup.
    suppressCloseRef.current = true;
    try {
      const { sRGBHex } = await new window.EyeDropper().open();
      const sampled = parseColor(sRGBHex);
      if (sampled) {
        onChange({ r: sampled.r, g: sampled.g, b: sampled.b, a: alpha });
      }
    } catch {
      // The sampler was dismissed — there is no colour to apply.
    } finally {
      suppressCloseRef.current = false;
    }
  };

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

      <div className={styles.pickerControls}>
        {hasEyedropper && (
          <button
            type="button"
            onClick={sampleScreen}
            aria-label={t("theme_pick_from_screen")}
            title={t("theme_pick_from_screen")}
            className={styles.eyedropper}
          >
            <Pipette size={15} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}

        <span
          aria-hidden="true"
          style={{ "--swatch-color": fromRgb(rgb) }}
          className={styles.previewDot}
        />

        <div className={styles.bars}>
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
            // The bar is the colour itself fading out over a chequerboard, so
            // its left end reads as see-through rather than as white.
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
      </div>

      <div className={styles.channels}>
        {channels.map((channel) => (
          <label key={channel.key} className={styles.channel}>
            <input
              type="text"
              inputMode="numeric"
              value={drafts[channel.key] ?? String(channel.value)}
              onChange={(event) => setChannel(channel, event.target.value)}
              onBlur={() =>
                setDrafts((current) => {
                  const next = { ...current };
                  delete next[channel.key];
                  return next;
                })
              }
              aria-label={channel.name}
              className={styles.channelBox}
            />
            <span className={styles.channelName}>{channel.name}</span>
          </label>
        ))}

        <button
          type="button"
          onClick={() => {
            setDrafts({});
            setAsHsl((wasHsl) => !wasHsl);
          }}
          aria-label={t("theme_switch_color_values")}
          title={t("theme_switch_color_values")}
          className={styles.channelToggle}
        >
          <ChevronsUpDown size={13} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

const SurveyColorPicker = CustomPicker(PickerBody);

/**
 * The picker, floated under the swatch that opened it.
 *
 * It is portalled to the body and positioned fixed because the panel it
 * belongs to scrolls: an absolutely positioned popup would be cut off by that
 * scroll box, which is the one thing a popup must never be. For the same
 * reason it is re-placed on scroll and resize, and flips above the swatch when
 * the window has no room below it.
 */
function PickerPopover({ anchorRef, label, suppressCloseRef, onClose, children }) {
  const popoverRef = React.useRef(null);
  const [position, setPosition] = React.useState(null);
  const rtl = isSessionRtl();

  const place = React.useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const below = rect.bottom + GAP;
    const top =
      below + height > window.innerHeight - EDGE
        ? Math.max(EDGE, rect.top - GAP - height)
        : below;
    // The popup opens from the swatch's leading edge, which is its right edge
    // in Arabic — the theme's own direction is pinned, so this reads the
    // session's instead.
    const start = rtl ? rect.right - width : rect.left;
    const left = Math.min(
      Math.max(EDGE, start),
      Math.max(EDGE, window.innerWidth - width - EDGE)
    );
    setPosition({ top, left });
  }, [anchorRef, rtl]);

  React.useLayoutEffect(place, [place]);

  React.useEffect(() => {
    // `mousedown`, not `click`: a drag that starts on the shade area and ends
    // outside the popup would otherwise close it on release.
    const onMouseDown = (event) => {
      const inside =
        popoverRef.current?.contains(event.target) ||
        anchorRef.current?.contains(event.target);
      if (!inside && !suppressCloseRef.current) {
        onClose(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose(true);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    // Capture, so the panel's own scroll box is heard as well as the window.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchorRef, onClose, place, suppressCloseRef]);

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={label}
      style={{
        top: position ? `${position.top}px` : 0,
        left: position ? `${position.left}px` : 0,
        // It is measured before it is placed; until then it must not be seen
        // in the corner it was measured in.
        visibility: position ? "visible" : "hidden",
      }}
      className={styles.pickerPopover}
    >
      {children}
    </div>,
    document.body
  );
}

/**
 * A colour setting: a row of named presets, and a custom editor behind the
 * last chip for anything else. The editor holds the swatch, a hex box and
 * Apply; the swatch opens the picker over the panel, the way a colour picker
 * has always opened over what it is colouring.
 *
 * The picker applies immediately — the survey next to it is the preview —
 * while the typed hex waits for Apply or Enter, so a half-typed value never
 * repaints the survey.
 *
 * Opacity belongs to the colour rather than beside it: the transparency bar
 * sits under the colour bar, and a translucent colour is written as
 * `rgba(...)`, the notation the theme has always stored one in.
 */
function ColorField({ t, name, label, value, presets, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [invalid, setInvalid] = React.useState(false);
  const swatchRef = React.useRef(null);
  // Raised while the screen sampler is up, so the click that samples a pixel
  // is not mistaken for a click away from the popup.
  const suppressCloseRef = React.useRef(false);

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

  // Dismissing with Escape puts the caller back on the swatch; dismissing by
  // clicking elsewhere leaves focus where the click put it.
  const closePicker = React.useCallback((refocus) => {
    setPickerOpen(false);
    if (refocus) {
      swatchRef.current?.focus();
    }
  }, []);

  const closeEditor = () => {
    setPickerOpen(false);
    setOpen(false);
  };

  const toggle = () => {
    if (open) {
      closeEditor();
      return;
    }
    setDraft(current);
    setInvalid(false);
    setOpen(true);
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
    closeEditor();
  };

  // A dragged picker carries the hex box with it, so the two never disagree.
  const picked = ({ rgb }) => {
    setDraft(fromRgb({ ...rgb, a: 1 }).toUpperCase());
    setInvalid(false);
    onChange(fromRgb(rgb));
  };

  const pick = (preset) => {
    closeEditor();
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
            // The popup is portalled, so its keystrokes still arrive here;
            // while it is open, Escape is its to answer, not the editor's.
            if (event.key === "Escape" && !pickerOpen) {
              event.preventDefault();
              closeEditor();
            }
          }}
        >
          <div className={styles.customRow}>
            <button
              ref={swatchRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              aria-label={t("theme_open_color_picker")}
              title={t("theme_open_color_picker")}
              onClick={() => setPickerOpen((wasOpen) => !wasOpen)}
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

          <p
            id={helpId}
            role={invalid ? "alert" : "status"}
            className={`${styles.help} ${invalid ? styles.helpError : ""}`}
          >
            {invalid ? t("theme_custom_hex_invalid") : t("theme_custom_hex_hint")}
          </p>

          {pickerOpen && (
            <PickerPopover
              anchorRef={swatchRef}
              label={`${label} — ${t("theme_custom_color")}`}
              suppressCloseRef={suppressCloseRef}
              onClose={closePicker}
            >
              <SurveyColorPicker
                t={t}
                color={pickerColor}
                suppressCloseRef={suppressCloseRef}
                onChange={picked}
              />
            </PickerPopover>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(ColorField);
