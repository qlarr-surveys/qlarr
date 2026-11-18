import React, { useId } from "react";
import {
  SetupAddButton,
  SetupCard,
  SetupHint,
  SetupRemoveButton,
  setupFieldStyles,
} from "~/components/design/setup/SetupFields";
import { useConditionalRelevance } from "./useConditionalRelevance";

const cx = (...names) => names.filter(Boolean).join(" ");

function ConditionalRelevance({ code, t }) {
  const titleId = useId();
  const { conditionalRelevance, errors, onDelete, onTextChange, onAdd } =
    useConditionalRelevance(code);

  if (!conditionalRelevance) {
    return (
      <SetupAddButton onClick={onAdd}>
        {t("add_conditional_relevance")}
      </SetupAddButton>
    );
  }

  return (
    <SetupCard
      aria-labelledby={titleId}
      invalid={errors.length > 0}
      title={<span id={titleId}>{t("relevance")}</span>}
      actions={<SetupRemoveButton label={t("delete")} onClick={onDelete} />}
    >
      <textarea
        rows={3}
        dir="ltr"
        spellCheck={false}
        aria-labelledby={titleId}
        aria-invalid={errors.length > 0}
        placeholder={t("conditional_relevance_text_placeholder")}
        value={conditionalRelevance.text || ""}
        onChange={(e) => onTextChange(e.target.value)}
        className={cx(
          setupFieldStyles.textarea,
          setupFieldStyles.code,
          errors.length > 0 && setupFieldStyles.invalid
        )}
      />
      {errors.map((err, i) => (
        <SetupHint key={i} error>
          {err.message}
        </SetupHint>
      ))}
    </SetupCard>
  );
}

export default ConditionalRelevance;
