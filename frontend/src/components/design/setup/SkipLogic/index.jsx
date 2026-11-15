import { ErrorOutlineOutlined } from "@mui/icons-material";
import { Autocomplete, Chip, TextField } from "@mui/material";
import { jumpDestinations } from "~/utils/design/access/jumpDestinations";
import { stripTags } from "~/utils/design/utils";
import {
  addSkipRule,
  updateSkipRule,
  removeSkipRule,
} from "~/state/design/designState";
import React, { useId, useMemo } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import {
  SetupAddButton,
  SetupCard,
  SetupLabel,
  SetupRemoveButton,
  SetupSelect,
  SetupSubField,
  SetupSubToggle,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";
import styles from "./SkipLogic.module.css";

function SkipLogic({ code, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const idBase = useId();

  // === SELECTORS ===
  const skipLogic = useSelector((state) => {
    const sl = state.designState[code].skip_logic;
    return Array.isArray(sl) ? sl : [];
  });

  const componentIndex = useSelector(
    (state) => state.designState.componentIndex
  );
  const mainLang = useSelector((state) => state.designState.langInfo.mainLang);
  const designState = useSelector((state) => state.designState);

  const destinations = useMemo(() => {
    return jumpDestinations(componentIndex, code, designState, mainLang);
  }, [componentIndex, code, designState, mainLang]);

  // Find the END group code for disqualify validation
  const endGroupCode = useMemo(() => {
    const survey = designState.Survey;
    const endGroup = survey?.children?.find(
      (child) => designState[child.code]?.groupType === "END"
    );
    return endGroup?.code;
  }, [designState]);

  const instructions = useSelector(
    (state) =>
      (state.designState[code]?.instructionList || []).filter((el) =>
        el.code?.startsWith("skip_to")
      ),
    shallowEqual
  );

  const lang = useSelector((state) => state.designState.langInfo.lang);
  const codeData = useSelector((state) => state.designState[code]);

  // Get all answer options with labels
  const children = useMemo(() => {
    return codeData?.children?.map((child) => {
      const rawLabel = designState[child.qualifiedCode].content?.[lang]?.label;
      return {
        code: child.code,
        label: rawLabel ? stripTags(rawLabel) : child.code,
      };
    });
  }, [codeData, designState, lang]);

  const getUsedAnswerCodes = (excludeRuleIndex) => {
    const used = new Set();
    skipLogic.forEach((rule, index) => {
      if (index !== excludeRuleIndex) {
        rule.condition?.forEach((code) => used.add(code));
      }
    });
    return used;
  };

  // === EVENT HANDLERS ===
  const onAddRule = () => {
    dispatch(addSkipRule({ code }));
  };

  const onRemoveRule = (ruleIndex) => {
    dispatch(removeSkipRule({ code, ruleIndex }));
  };

  const onConditionChange = (ruleIndex, newConditions) => {
    dispatch(
      updateSkipRule({
        code,
        ruleIndex,
        updates: { condition: newConditions.map((c) => c.code) },
      })
    );
  };

  const onDestinationChange = (ruleIndex, skipTo) => {
    dispatch(updateSkipRule({ code, ruleIndex, updates: { skipTo } }));
  };

  const onToEndChange = (ruleIndex, toEnd) => {
    dispatch(updateSkipRule({ code, ruleIndex, updates: { toEnd } }));
  };

  const onDisqualifyChange = (ruleIndex, disqualify) => {
    dispatch(updateSkipRule({ code, ruleIndex, updates: { disqualify } }));
  };

  // === RENDER ===
  return (
    <div role="group" aria-labelledby={`${idBase}-title`}>
      <div className={setupFieldStyles.head}>
        <SetupLabel
          id={`${idBase}-title`}
          label={t("skip_logic")}
          help={help("skip_logic")}
        />
      </div>

      <div className={setupFieldStyles.stack}>
        {skipLogic.map((rule, ruleIndex) => {
          const usedCodes = getUsedAnswerCodes(ruleIndex);
          const availableOptions = children?.filter(
            (child) =>
              !usedCodes.has(child.code) ||
              rule.condition?.includes(child.code)
          );
          const selectedOptions =
            children?.filter((child) =>
              rule.condition?.includes(child.code)
            ) || [];

          // Check for invalid skip destination
          const invalidSkipDestination =
            rule.skipTo &&
            instructions
              ?.find((el) => el.code === "skip_to_" + (ruleIndex + 1))
              ?.errors?.find((el) => el.name === "InvalidSkipReference");

          // Determine if toEnd should be disabled
          let toEndDisabled = false;
          if (rule.skipTo && rule.skipTo.startsWith("G")) {
            const groups = destinations.filter((el) =>
              el.code.startsWith("G")
            );
            toEndDisabled =
              groups.length >= 2 &&
              groups[groups.length - 1].code === rule.skipTo;
          }

          // Disqualify is only allowed when skipping to END group
          const disqualifyDisabled = rule.skipTo !== endGroupCode;

          const titleId = `${idBase}-rule-${ruleIndex}`;
          const destinationId = `${idBase}-to-${ruleIndex}`;

          return (
            <SetupCard
              key={ruleIndex}
              aria-labelledby={titleId}
              invalid={!!invalidSkipDestination}
              title={<span id={titleId}>{t("select_conditions")}</span>}
              actions={
                <SetupRemoveButton
                  label={t("remove_rule")}
                  onClick={() => onRemoveRule(ruleIndex)}
                />
              }
            >
              <Autocomplete
                multiple
                noOptionsText={t("logic_builder.no_options")}
                options={availableOptions || []}
                value={selectedOptions}
                onChange={(event, newValue) =>
                  onConditionChange(ruleIndex, newValue)
                }
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) =>
                  option.code === value.code
                }
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        label={option.label}
                        size="small"
                        {...tagProps}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    size="small"
                    inputProps={{
                      ...params.inputProps,
                      "aria-labelledby": titleId,
                    }}
                    placeholder={
                      selectedOptions.length === 0
                        ? t("select_conditions")
                        : ""
                    }
                  />
                )}
              />

              {invalidSkipDestination ? (
                <div className={styles.errorDisplay} role="alert">
                  <ErrorOutlineOutlined className={styles.errorIcon} />
                  <span className={styles.errorText}>
                    {t("invalid_skip_destination_err", { code: rule.skipTo })}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDestinationChange(ruleIndex, null)}
                    className={setupFieldStyles.secondaryButton}
                  >
                    {t("ok")}
                  </button>
                </div>
              ) : (
                <>
                  <SetupSubField label={t("skip_to")} htmlFor={destinationId}>
                    <SetupSelect
                      id={destinationId}
                      value={rule.skipTo || ""}
                      onChange={(e) =>
                        onDestinationChange(ruleIndex, e.target.value || null)
                      }
                    >
                      <option value="">—</option>
                      {destinations?.map((element) => (
                        <option key={element.code} value={element.code}>
                          {element.label}
                        </option>
                      ))}
                    </SetupSelect>
                  </SetupSubField>

                  {rule.skipTo && rule.skipTo.startsWith("G") && (
                    <div className={styles.endOptions}>
                      <SetupSubToggle
                        label={t("to_group_end")}
                        checked={rule.toEnd || false}
                        disabled={toEndDisabled}
                        onChange={(checked) =>
                          onToEndChange(ruleIndex, checked)
                        }
                      />
                      <SetupSubToggle
                        label={t("disqualify")}
                        checked={rule.disqualify || false}
                        disabled={disqualifyDisabled}
                        onChange={(checked) =>
                          onDisqualifyChange(ruleIndex, checked)
                        }
                      />
                    </div>
                  )}
                </>
              )}
            </SetupCard>
          );
        })}

        <SetupAddButton onClick={onAddRule}>{t("add_skip_rule")}</SetupAddButton>
      </div>
    </div>
  );
}

export default SkipLogic;
