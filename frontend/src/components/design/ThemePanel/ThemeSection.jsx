import React from "react";
import { ChevronRight } from "lucide-react";
import styles from "./ThemePanel.module.css";

/**
 * One collapsible group of theme settings. The header carries a summary of the
 * group on the right — the current font, the number of colours, the kind of
 * background — so the panel still answers "what is this survey set to" while
 * every group is closed.
 */
function ThemeSection({ id, title, meta, open, onToggle, children }) {
  const bodyId = `theme-section-${id}`;

  return (
    <section className={`${styles.section} ${open ? styles.sectionOpen : ""}`}>
      <h3 className={styles.sectionHeading}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className={styles.sectionButton}
        >
          <ChevronRight
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          />
          <span className={styles.sectionTitle}>{title}</span>
          <span className={styles.sectionMeta}>{meta}</span>
        </button>
      </h3>
      {open && (
        <div id={bodyId} className={styles.sectionBody}>
          {children}
        </div>
      )}
    </section>
  );
}

export default React.memo(ThemeSection);
