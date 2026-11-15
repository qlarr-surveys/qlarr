import React, { useId, useMemo } from "react";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { setDefaultValue } from "~/state/design/designState";
import { stripTags } from "~/utils/design/utils";
import {
  SetupField,
  SetupSelect,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

function ScqDefaultValue({ code }) {
  const dispatch = useDispatch();
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const help = useSetupHelp();
  const id = useId();

  const answers = useSelector(
    (state) => state.designState[code]?.children || []
  );

  const currentInstruction = useSelector((state) => {
    return state.designState[code]?.instructionList?.find(
      (instruction) => instruction.code === "value"
    );
  });

  const langInfo = useSelector((state) => {
    return state.designState.langInfo;
  });

  const answerData = useSelector((state) => {
    const data = {};
    answers.forEach((answer) => {
      if (answer && answer.qualifiedCode) {
        data[answer.code] = state.designState[answer.qualifiedCode];
      }
    });
    return data;
  }, shallowEqual);

  const currentDefaultValue = currentInstruction?.text || "";

  const answerLabels = useMemo(() => {
    const labels = {};
    answers.forEach((answer) => {
      if (answer && answer.qualifiedCode) {
        const data = answerData[answer.code];
        const rawLabel =
          stripTags(data?.content?.[langInfo.mainLang]?.label) ||
          answer.code;
        labels[answer.code] = rawLabel;
      }
    });
    return labels;
  }, [answers, answerData, langInfo.mainLang]);

  const getAnswerLabel = (answerCode) => {
    return answerLabels[answerCode] || answerCode;
  };

  const handleDefaultValueChange = (event) => {
    const selectedValue = event.target.value;
    dispatch(setDefaultValue({ code, selectedValue }));
  };

  if (!answers.length) {
    return null;
  }

  // A default whose answer is gone is still the saved value: name it rather
  // than let the select fall back to showing "No default".
  const isOrphan =
    !!currentDefaultValue &&
    !answers.some((answer) => answer.code === currentDefaultValue);

  return (
    <SetupField
      label={t("default_value")}
      help={help("default_value")}
      htmlFor={id}
    >
      <SetupSelect
        id={id}
        value={currentDefaultValue}
        onChange={handleDefaultValueChange}
      >
        <option value="">{t("no_default")}</option>
        {answers.map((answer) => (
          <option key={answer.code} value={answer.code}>
            {getAnswerLabel(answer.code)}
          </option>
        ))}
        {isOrphan && (
          <option value={currentDefaultValue}>
            {getAnswerLabel(currentDefaultValue)}
          </option>
        )}
      </SetupSelect>
    </SetupField>
  );
}

export default ScqDefaultValue;
