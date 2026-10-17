import React, { Fragment } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import styles from "./ActionCards.module.css";

/**
 * The row of action cards above the survey list.
 *
 * The grid is `auto-fit` over a minimum width rather than a fixed column count,
 * so two cards (this repo) and three (the hosted fork, which adds the AI card)
 * both come out as equal columns without a branch.
 *
 * An action may also carry a `widget`: a surface the card opens, mounted
 * beside it. See `~/features/ai/README.md`.
 */
function ActionCards({ actions }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  if (!actions.length) {
    return null;
  }

  return (
    <Box className={styles.grid}>
      {actions.map(
        ({ key, titleKey, descriptionKey, icon: Icon, tone, onClick, widget }) => (
          <Fragment key={key}>
            <button
              type="button"
              className={styles.card}
              data-tone={tone}
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
            {/* An action may carry its own surface - a drawer or dialog the
                card opens. Nothing in this repo does; the hosted fork's AI
                card mounts its chat widget here, so the page stays identical
                across both. It must portal out of the grid, or it would
                become a cell among the cards. */}
            {widget}
          </Fragment>
        )
      )}
    </Box>
  );
}

export default React.memo(ActionCards);
