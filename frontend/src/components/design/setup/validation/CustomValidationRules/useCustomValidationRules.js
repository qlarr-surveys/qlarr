import { useDispatch, useSelector } from "react-redux";
import {
  addCustomValidationRule,
  updateCustomValidationRuleText,
  renameCustomValidationRule,
  updateCustomValidationRuleError,
  removeCustomValidationRule,
} from "~/state/design/designState";

export function useCustomValidationRules(code, t) {
  const dispatch = useDispatch();

  const customRules = useSelector((state) => {
    const instructionList = state.designState[code]?.instructionList || [];
    const content = state.designState[code]?.content || {};
    return instructionList
      .filter((i) => /^validation_custom_/.test(i.code))
      .map((i) => ({
        code: i.code,
        rule: i.text,
        errors: i.errors || [],
        errorMessages: Object.fromEntries(
          Object.entries(content).map(([lang, langContent]) => [
            lang,
            langContent?.[i.code] || "",
          ])
        ),
      }));
  });

  const languagesList = useSelector((state) => {
    return state.designState.langInfo.languagesList;
  });

  const validateRuleIdSuffix = (suffix, currentRuleCode) => {
    if (!suffix) {
      return t("validation_id_required");
    }
    const fullCode = `validation_custom_${suffix}`;
    const isDuplicate = customRules.some(
      (rule) => rule.code !== currentRuleCode && rule.code === fullCode
    );
    if (isDuplicate) {
      return t("validation_id_duplicate");
    }
    return null;
  };

  const onAddRule = () => {
    dispatch(addCustomValidationRule({ code }));
  };

  const onRemoveRule = (ruleCode) => {
    dispatch(removeCustomValidationRule({ code, ruleCode }));
  };

  const onRuleChange = (ruleCode, text) => {
    dispatch(updateCustomValidationRuleText({ code, ruleCode, text }));
  };

  const onRuleIdChange = (ruleCode, newSuffix) => {
    dispatch(
      renameCustomValidationRule({
        code,
        ruleCode,
        newCode: `validation_custom_${newSuffix}`,
      })
    );
  };

  const onErrorMessageChange = (ruleCode, lang, value) => {
    dispatch(updateCustomValidationRuleError({ code, ruleCode, lang, value }));
  };

  return {
    customRules,
    languagesList,
    validateRuleIdSuffix,
    onAddRule,
    onRemoveRule,
    onRuleChange,
    onRuleIdChange,
    onErrorMessageChange,
  };
}
