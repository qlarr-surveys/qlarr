import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import useWorkspaceTabs from "./useWorkspaceTabs";
import styles from "./WorkspaceTabs.module.css";

/**
 * The survey editor's top-level navigation: Builder, Theme, Translation,
 * Settings and Responses, as one horizontal tab strip.
 *
 * This replaces the dark vertical icon rail. The destinations are unchanged —
 * see `useWorkspaceTabs` for the routing — but they are now labelled rather
 * than icon-only behind a tooltip, and each tab is a real `button` inside a
 * `Link` so it is reachable and announced as a tab.
 */
function WorkspaceTabs({ availablePages, selectedPage, surveyId, onPageChange }) {
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const tabs = useWorkspaceTabs({
    availablePages,
    selectedPage,
    surveyId,
    onPageChange,
  });

  if (!tabs.length) {
    return null;
  }

  return (
    <nav
      role="tablist"
      aria-label={t("survey_workspaces")}
      data-tour="side-tabs"
      className={styles.strip}
    >
      {tabs.map(({ key, labelKey, icon: Icon, to, dataTour, selected, badge, onSelect }) => (
        <Link key={key} to={to} onClick={onSelect} className={styles.link}>
          <button
            type="button"
            role="tab"
            aria-selected={selected}
            data-tour={dataTour}
            className={`${styles.tab} ${selected ? styles.selected : ""}`}
          >
            <span className={styles.icon}>
              {/* Lucide draws on the rendered pixel grid rather than MUI's 24px
                  one, so the size is the icon's real size and the stroke is set
                  with it: scale one without the other and the glyph thickens or
                  thins against its neighbours. */}
              <Icon size={16} strokeWidth={1.33} aria-hidden="true" />
              {badge && <span className={styles.unpublishedChangesDot} />}
            </span>
            <span>{t(labelKey)}</span>
          </button>
        </Link>
      ))}
    </nav>
  );
}

export default React.memo(WorkspaceTabs);
