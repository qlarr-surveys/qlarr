import { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { isGroup } from "~/utils/design/utils";
import { surveySetup, setupOptions } from "@qlarr/design-core/constants/design";
import { setup } from "~/state/design/designState";
import { getHighlighted, isLabelInstruction } from "~/utils/design/errorDisplay";

const useErrorDisplay = (code) => {
  const dispatch = useDispatch();

  const isGroupCode = isGroup(code);

  const selectErrorsAndInstructions = useMemo(
    () =>
      createSelector(
        [
          (state) => state.designState,
          (state) => state.designState.langInfo,
        ],
        (fullState, langInfo) => {
          const designState = fullState[code] || {};
          const onMainLang = langInfo?.onMainLang === true;

          const instructionsWithErrors =
            designState.instructionList?.filter(
              (instruction) =>
                instruction.errors?.length > 0 &&
                (onMainLang || isLabelInstruction(instruction.code))
            ) || [];

          if (onMainLang && designState.carryForward) {
            const carryErrors = (designState.children || []).flatMap((child) => {
              const cr = fullState[child.qualifiedCode]?.instructionList?.find(
                (i) => i.code === "conditional_relevance"
              );
              return cr?.errors?.length ? cr.errors : [];
            });
            if (carryErrors.length) {
              instructionsWithErrors.push({
                code: "carry_forward",
                errors: carryErrors,
              });
            }
          }

          const errors = onMainLang
            ? isGroupCode
              ? designState.errors?.filter((e) => e !== "EMPTY_PARENT")
              : designState.errors
            : undefined;

          return {
            errors,
            designErrors: onMainLang ? designState.designErrors : undefined,
            instructions: instructionsWithErrors.length
              ? instructionsWithErrors
              : undefined,
            currentLang: langInfo?.lang,
          };
        }
      ),
    [code, isGroupCode]
  );

  const { errors, designErrors, instructions, currentLang } = useSelector(
    selectErrorsAndInstructions
  );

  const hasErrors =
    errors?.length > 0 || designErrors?.length > 0 || instructions?.length > 0;

  const type = useSelector((state) => {
    return code === "Survey"
      ? ""
      : isGroup(code)
      ? state.designState[code].groupType?.toLowerCase() || "group"
      : state.designState[code].type;
  });

  const onErrClick = (instruction) => {
    const highlighted = getHighlighted(instruction.code);
    if (!highlighted) return;
    const isRandomOnSurvey =
      (instruction.code === "random_group" ||
        instruction.code === "priority_groups") &&
      code === "Survey";
    dispatch(
      setup(
        isRandomOnSurvey
          ? { ...surveySetup, highlighted }
          : { code, rules: setupOptions(type), highlighted }
      )
    );
  };

  return { errors, designErrors, instructions, hasErrors, onErrClick, currentLang };
};

export default useErrorDisplay;
