import React from "react";
import { Ellipsis } from "lucide-react";
import styles from "./SetupPanel.module.css";

const cx = (...names) => names.filter(Boolean).join(" ");

/**
 * The "…" beside "Show advanced settings": whether the advanced settings open
 * only when asked ("Expand on demand") or for every question selected
 * ("Always expand"). A menu of two radio items, keyboard-driven the way the
 * design's is: arrows open it and move through it, Escape closes it.
 */
function AdvancedModeMenu({ alwaysExpand, onChange, t }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const itemRefs = React.useRef([]);
  const menuId = React.useId();

  const modes = [
    {
      value: false,
      title: t("expand_on_demand"),
      hint: t("expand_on_demand_hint"),
    },
    {
      value: true,
      title: t("always_expand"),
      hint: t("always_expand_hint"),
    },
  ];
  const selectedIndex = alwaysExpand ? 1 : 0;
  const triggerLabel = t("advanced_settings_mode", {
    mode: modes[selectedIndex].title,
  });

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }
    itemRefs.current[selectedIndex]?.focus();
    const closeOnOutside = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
    // Focus moves to the chosen mode once, when the menu opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const pick = (value) => {
    if (value !== alwaysExpand) {
      onChange(value);
    }
    close();
  };

  const onTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (event) => {
    const items = itemRefs.current.filter(Boolean);
    const index = items.indexOf(document.activeElement);
    const focus = (item) => {
      event.preventDefault();
      item?.focus();
    };
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
      case "ArrowDown":
        focus(items[index + 1] || items[0]);
        break;
      case "ArrowUp":
        focus(items[index - 1] || items[items.length - 1]);
        break;
      case "Home":
        focus(items[0]);
        break;
      case "End":
        focus(items[items.length - 1]);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={wrapRef} className={styles.modeWrap}>
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.modeTrigger, alwaysExpand && styles.modeTriggerOn)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
        data-preview-allow
      >
        <Ellipsis size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("advanced_settings")}
          className={styles.modeMenu}
          onKeyDown={onMenuKeyDown}
        >
          <div role="presentation" className={styles.modeMenuTitle}>
            {t("advanced_settings")}
          </div>
          {modes.map((mode, index) => {
            const selected = mode.value === alwaysExpand;
            return (
              <button
                key={String(mode.value)}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                tabIndex={-1}
                className={cx(styles.modeItem, selected && styles.modeItemSelected)}
                onClick={() => pick(mode.value)}
                data-preview-allow
              >
                <span
                  aria-hidden="true"
                  className={cx(styles.modeRadio, selected && styles.modeRadioOn)}
                >
                  <span className={styles.modeDot} />
                </span>
                <span className={styles.modeText}>
                  <span className={styles.modeTitle}>{mode.title}</span>
                  <span className={styles.modeHint}>{mode.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(AdvancedModeMenu);
