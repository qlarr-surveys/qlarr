import React, { useEffect, useId, useState } from "react";
import {
  SetupCard,
  SetupHint,
  SetupLangInput,
  SetupPrefixInput,
  SetupRemoveButton,
  SetupSubField,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

const cx = (...names) => names.filter(Boolean).join(" ");

const ID_PREFIX = "validation_custom_";

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
  const help = useSetupHelp();
  const idBase = useId();
  const [idSuffix, setIdSuffix] = useState(
    rule.code?.replace(/^validation_custom_/, "") || ""
  );

  useEffect(() => {
    setIdSuffix(rule.code?.replace(/^validation_custom_/, "") || "");
  }, [rule.code]);

  const idError = validateRuleIdSuffix(idSuffix, rule.code);
  const hasRuleErrors = rule.errors.length > 0;
  const title = `${t("custom_rule")} #${ruleIndex + 1}`;

  return (
    <SetupCard
      aria-label={title}
      invalid={!!idError || hasRuleErrors}
      title={title}
      actions={
        <SetupRemoveButton
          label={t("remove_rule")}
          onClick={() => onRemoveRule(rule.code)}
        />
      }
    >
      <SetupSubField label={t("validation_rule_id")} htmlFor={`${idBase}-id`}>
        <SetupPrefixInput
          id={`${idBase}-id`}
          prefix={ID_PREFIX}
          placeholder="custom_rule"
          value={idSuffix}
          invalid={!!idError}
          aria-describedby={idError ? `${idBase}-id-error` : undefined}
          onChange={(e) =>
            setIdSuffix(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
          }
          onBlur={() => !idError && onRuleIdChange(rule.code, idSuffix)}
        />
        {idError && (
          <SetupHint id={`${idBase}-id-error`} error>
            {idError}
          </SetupHint>
        )}
      </SetupSubField>

      <SetupSubField
        label={t("rule_condition")}
        help={help("expression_reference")}
        htmlFor={`${idBase}-rule`}
      >
        <textarea
          id={`${idBase}-rule`}
          rows={2}
          dir="ltr"
          spellCheck={false}
          placeholder={t("enter_validation_rule")}
          value={rule.rule || ""}
          onChange={(e) => onRuleChange(rule.code, e.target.value)}
          aria-invalid={hasRuleErrors}
          className={cx(
            setupFieldStyles.textarea,
            setupFieldStyles.code,
            hasRuleErrors && setupFieldStyles.invalid
          )}
        />
        {rule.errors.map((err, i) => (
          <SetupHint key={i} error>
            {err.message}
          </SetupHint>
        ))}
      </SetupSubField>

      <SetupSubField label={t("error_messages")} id={`${idBase}-messages`}>
        <div
          role="group"
          aria-labelledby={`${idBase}-messages`}
          className={setupFieldStyles.langList}
        >
          {languagesList.map((lang) => (
            <SetupLangInput
              key={lang.code}
              lang={lang}
              label={t("error_message")}
              placeholder={t("error_message")}
              value={rule.errorMessages?.[lang.code] || ""}
              onChange={(value) =>
                onErrorMessageChange(rule.code, lang.code, value)
              }
            />
          ))}
        </div>
      </SetupSubField>
    </SetupCard>
  );
}

export default RuleCard;
