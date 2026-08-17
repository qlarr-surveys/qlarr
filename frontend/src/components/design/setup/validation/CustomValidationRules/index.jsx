import { AddOutlined } from "@mui/icons-material";
import { Button, Divider, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { useCustomValidationRules } from "./useCustomValidationRules";
import RuleCard from "./RuleCard";

function CustomValidationRules({ code, t }) {
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);
  const {
    customRules,
    languagesList,
    validateRuleIdSuffix,
    onAddRule,
    onRemoveRule,
    onRuleChange,
    onRuleIdChange,
    onErrorMessageChange,
  } = useCustomValidationRules(code, t);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <CustomTooltip body={tTooltips("custom_validation_rules")} />
        <Typography fontWeight={700}>{t("custom_validation_rules")}</Typography>
      </div>
      <Divider sx={{ my: 1 }} />

      {customRules.map((rule, ruleIndex) => (
        <RuleCard
          key={rule.code}
          rule={rule}
          ruleIndex={ruleIndex}
          languagesList={languagesList}
          t={t}
          validateRuleIdSuffix={validateRuleIdSuffix}
          onRemoveRule={onRemoveRule}
          onRuleChange={onRuleChange}
          onRuleIdChange={onRuleIdChange}
          onErrorMessageChange={onErrorMessageChange}
        />
      ))}

      <Button
        variant="outlined"
        startIcon={<AddOutlined />}
        onClick={onAddRule}
        sx={{ mt: 2 }}
        fullWidth
      >
        {t("add_custom_validation_rule")}
      </Button>
    </>
  );
}

export default CustomValidationRules;
