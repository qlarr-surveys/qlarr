import React from "react";
import { Box, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { changeValidationValue } from "~/state/design/designState";
import PresetRuleCard from "./PresetRuleCard";
import AddRulePicker from "./AddRulePicker";
import RuleCard from "../CustomValidationRules/RuleCard";
import { useCustomValidationRules } from "../CustomValidationRules/useCustomValidationRules";

/**
 * Validation tab body. Shows only the *active* rules as cards (Required pinned
 * first), with an "Add rule" picker that surfaces the remaining inactive
 * validations and the option to add a custom rule.
 *
 * `validationRules` is the question type's validation catalog, e.g.
 * ["validation_required", "validation_between", ..., "custom_validation_rules"].
 */
function ValidationRulesPanel({ code, t, validationRules }) {
  const dispatch = useDispatch();

  const supportsCustom = validationRules.includes("custom_validation_rules");
  const presetCatalog = validationRules.filter((r) =>
    r.startsWith("validation_")
  );

  const validationState = useSelector(
    (state) => state.designState[code]?.validation || {}
  );

  const hasRequired = presetCatalog.includes("validation_required");
  const otherPresets = presetCatalog.filter((r) => r !== "validation_required");
  const activeOtherPresets = otherPresets.filter(
    (r) => validationState[r]?.isActive
  );
  const availablePresets = otherPresets.filter(
    (r) => !validationState[r]?.isActive
  );

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

  const onAddPreset = (rule) =>
    dispatch(
      changeValidationValue({ code, rule, key: "isActive", value: true })
    );

  return (
    <Box>

      {hasRequired && (
        <PresetRuleCard
          code={code}
          rule="validation_required"
          validationRule={validationState["validation_required"]}
          pinned
          t={t}
        />
      )}

      {activeOtherPresets.map((rule) => (
        <PresetRuleCard
          key={rule}
          code={code}
          rule={rule}
          validationRule={validationState[rule]}
          t={t}
        />
      ))}

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

      <AddRulePicker
        availablePresets={availablePresets}
        supportsCustom={supportsCustom}
        onAddPreset={onAddPreset}
        onAddCustom={onAddRule}
        t={t}
      />
    </Box>
  );
}

export default React.memo(ValidationRulesPanel);
