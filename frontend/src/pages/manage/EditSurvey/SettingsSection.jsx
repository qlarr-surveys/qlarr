import React from "react";
import { headingDomId, sectionDomId } from "./useSectionSpy";
import styles from "./EditSurvey.module.css";

/**
 * One card of the Settings canvas: its title and what it covers, then its
 * settings, one row each.
 *
 * The heading takes focus programmatically (tabIndex -1) so that jumping to the
 * section from the nav moves the keyboard there too.
 */
function SettingsSection({ id, title, hint, children }) {
  return (
    <section
      id={sectionDomId(id)}
      aria-labelledby={headingDomId(id)}
      className={styles.card}
    >
      <div className={styles.cardHead}>
        <h2 id={headingDomId(id)} tabIndex={-1} className={styles.cardTitle}>
          {title}
        </h2>
        {hint && <p className={styles.cardHint}>{hint}</p>}
      </div>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}

export default React.memo(SettingsSection);
