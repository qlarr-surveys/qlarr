import { DeleteOutline } from "@mui/icons-material";
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import styles from "./CustomValidationRules.module.css";

function RuleCard({
  rule,
  ruleIndex,
  languagesList,
  t,
  validateRuleIdSuffix,
  onRemoveRule,
  onRuleChange,
  onRuleIdChange,
  onErrorMessageChange,
}) {
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);
  const [idSuffix, setIdSuffix] = useState(
    rule.code?.replace(/^validation_custom_/, "") || ""
  );

  useEffect(() => {
    setIdSuffix(rule.code?.replace(/^validation_custom_/, "") || "");
  }, [rule.code]);

  const idError = validateRuleIdSuffix(idSuffix, rule.code);

  return (
    <Box className={styles.ruleCard}>
      <Box className={styles.ruleHeader}>
        <Typography fontWeight={600}>
          {t("custom_rule")} #{ruleIndex + 1}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onRemoveRule(rule.code)}
          color="error"
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
          {t("validation_rule_id")}
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="custom_rule"
          value={idSuffix}
          onChange={(e) => setIdSuffix(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
          onBlur={() => !idError && onRuleIdChange(rule.code, idSuffix)}
          error={!!idError}
          helperText={idError}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Typography
                  component="span"
                  sx={{ color: "text.secondary", fontWeight: 500 }}
                >
                  validation_custom_
                </Typography>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
          <CustomTooltip body={tTooltips("expression_reference")} />
          <Typography variant="body2" fontWeight={600}>
            {t("rule_condition")}
          </Typography>
        </div>
        <TextField
          fullWidth
          multiline
          rows={2}
          variant="outlined"
          size="small"
          placeholder={t("enter_validation_rule")}
          value={rule.rule || ""}
          onChange={(e) => onRuleChange(rule.code, e.target.value)}
          error={rule.errors.length > 0}
        />
        {rule.errors.map((err, i) => (
          <Typography
            key={i}
            variant="caption"
            color="error"
            display="block"
            sx={{ mt: 0.5 }}
          >
            {err.message}
          </Typography>
        ))}
      </Box>

      <Typography fontWeight={700} sx={{ mt: 2, mb: 1 }}>
        {t("error_messages")}
      </Typography>

      <Box className={styles.errorWrapper}>
        <Box className={styles.errorLabelWrapper}>
          {languagesList.map((l) => (
            <Box
              key={l.code}
              className={`${styles.errorItem} ${styles.uppercase}`}
            >
              {l.code}:
            </Box>
          ))}
        </Box>
        <Box className={styles.errorItemContainer}>
          {languagesList.map((l) => (
            <Box key={l.code} className={styles.errorItem}>
              <TextField
                fullWidth
                size="small"
                variant="standard"
                placeholder={t("error_message")}
                value={rule.errorMessages?.[l.code] || ""}
                onChange={(e) =>
                  onErrorMessageChange(rule.code, l.code, e.target.value)
                }
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default RuleCard;
