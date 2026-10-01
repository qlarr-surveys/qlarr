import { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { isGroup } from "~/utils/design/utils";
import { surveySetup, setupOptions } from "@qlarr/design-core/constants/design";
import { setup, disableCarryForward } from "~/state/design/designState";
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

          // The repeat condition's errors ride on repeatInfo (they can't attach to
          // a normal instruction — the injected relevance only exists on copies).
          const repeatRelevanceErrors =
            designState.repeatInfo?.relevanceInstructionErrors;
          if (onMainLang && repeatRelevanceErrors?.length) {
            instructionsWithErrors.push({
              code: "repeat_relevance",
              errors: repeatRelevanceErrors,
            });
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

  // A broken carry forward can't be fixed from the setup panel (it filters out
  // the now-invalid source), so let the user drop it straight from the error.
  const carryForward = useSelector(
    (state) => state.designState[code]?.carryForward
  );
  const onRemoveCarryForward = () => {
    if (!carryForward) return;
    Object.keys(carryForward).forEach((axis) =>
      dispatch(disableCarryForward({ targetCode: code, axis }))
    );
  };

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

  return {
    errors,
    designErrors,
    instructions,
    hasErrors,
    onErrClick,
    onRemoveCarryForward,
    currentLang,
  };
};

export default useErrorDisplay;
