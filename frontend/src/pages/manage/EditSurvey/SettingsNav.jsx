import React from "react";
import styles from "./EditSurvey.module.css";

/**
 * The Settings workspace's left panel: one entry per section card, to jump to
 * it. The entry for the section being read is marked, and two flag what needs
 * a look — Launch while the survey has something to publish, Quotas while no
 * quota is set.
 */
function SettingsNav({ t, sections, active, onPick }) {
  return (
    <aside
      aria-label={t("edit_survey.configuration")}
      className={styles.aside}
    >
      <div className={styles.head}>
        <h2 className={styles.headTitle}>{t("edit_survey.configuration")}</h2>
        <p className={styles.headHint}>{t("edit_survey.configuration_hint")}</p>
      </div>
      <nav aria-label={t("edit_survey.sections")} className={styles.nav}>
        {sections.map(({ id, title, badge }) => {
          const current = id === active;
          return (
            <button
              key={id}
              type="button"
              aria-current={current ? "location" : undefined}
              onClick={() => onPick(id)}
              className={`${styles.navItem} ${current ? styles.navItemOn : ""}`}
            >
              <span className={styles.navLabel}>{title}</span>
              {badge === "action" && (
                <span className={styles.badgeAction}>
                  {t("edit_survey.badge_action")}
                </span>
              )}
              {badge === "off" && (
                <span className={styles.badgeOff}>
                  {t("edit_survey.badge_off")}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default React.memo(SettingsNav);
