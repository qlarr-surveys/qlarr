import React from "react";
import { Box, IconButton, Switch, Typography } from "@mui/material";
import { DeleteOutline } from "@mui/icons-material";
import { useDispatch } from "react-redux";
import { changeValidationValue } from "~/state/design/designState";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import ValidationSetupValue from "~/components/design/setup/validation/ValidationSetupValue";
import ValidationSetupMessage from "~/components/design/setup/validation/ValidationSetupMessage";
import styles from "./ValidationRulesPanel.module.css";

/**
 * A single preset validation rule rendered as a card.
 * - `pinned` rules (e.g. Required) always render with an on/off toggle.
 * - non-pinned rules only appear once active, and expose a remove action
 *   that drops them back into the "Add rule" pool.
 */
function PresetRuleCard({ code, rule, validationRule, pinned, t }) {
  const dispatch = useDispatch();
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);
  const isActive = validationRule?.isActive || false;

  const setActive = (value) =>
    dispatch(changeValidationValue({ code, rule, key: "isActive", value }));

  return (
    <Box className={styles.ruleCard}>
      <Box className={styles.ruleHeader}>
        <Box className={styles.ruleTitle}>
          <CustomTooltip body={tTooltips(rule)} />
          <Typography fontWeight={700}>{t(rule + "_title")}</Typography>
        </Box>
        {pinned ? (
          <Switch
            inputProps={{ "aria-label": "Switch validation" }}
            checked={isActive}
            onChange={(event) => setActive(event.target.checked)}
          />
        ) : (
          <IconButton
            size="small"
            color="error"
            onClick={() => setActive(false)}
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        )}
      </Box>
      {isActive && (
        <Box className={styles.ruleBody}>
          <ValidationSetupValue
            code={code}
            validation={validationRule}
            rule={rule}
            t={t}
          />
          <ValidationSetupMessage
            code={code}
            validationRule={validationRule}
            rule={rule}
            t={t}
          />
        </Box>
      )}
    </Box>
  );
}

export default React.memo(PresetRuleCard);
