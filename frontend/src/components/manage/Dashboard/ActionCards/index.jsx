import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import styles from "./ActionCards.module.css";

/**
 * The row of action cards above the survey list.
 *
 * The grid is `auto-fit` over a minimum width rather than a fixed column count,
 * so the row stays even however many cards the role allows.
 */
function ActionCards({ actions }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  if (!actions.length) {
    return null;
  }

  return (
    <Box className={styles.grid}>
      {actions.map(({ key, titleKey, descriptionKey, icon: Icon, onClick }) => (
        <button
          key={key}
          type="button"
          className={styles.card}
          onClick={onClick}
        >
          <span aria-hidden="true" className={styles.iconBadge}>
            <Icon fontSize="small" />
          </span>
          <Typography component="span" className={styles.title}>
            {t(titleKey)}
          </Typography>
          <Typography component="span" className={styles.description}>
            {t(descriptionKey)}
          </Typography>
        </button>
      ))}
    </Box>
  );
}

export default React.memo(ActionCards);
