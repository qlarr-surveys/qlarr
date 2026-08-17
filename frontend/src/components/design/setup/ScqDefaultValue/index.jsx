import React, { useMemo } from "react";
import { MenuItem, Typography, FormControl, Select } from "@mui/material";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { setDefaultValue } from "~/state/design/designState";
import { stripTags } from "~/utils/design/utils";

function ScqDefaultValue({ code }) {
  const dispatch = useDispatch();
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);

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

  return (
    <div style={{ marginBottom: "16px" }}>
      <Typography fontWeight={700} style={{ marginBottom: "8px" }}>
        {t("default_value")}
      </Typography>
      <Select
        fullWidth
        value={currentDefaultValue}
        onChange={handleDefaultValueChange}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) {
            return t("no_default");
          }
          return getAnswerLabel(selected);
        }}
      >
        <MenuItem value="">
          <em>{t("no_default")}</em>
        </MenuItem>
        {answers.map((answer) => (
          <MenuItem key={answer.code} value={answer.code}>
            {getAnswerLabel(answer.code)}
          </MenuItem>
        ))}
      </Select>
    </div>
  );
}

export default ScqDefaultValue;
