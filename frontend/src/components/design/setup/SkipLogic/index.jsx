import { AddOutlined, DeleteOutline, ErrorOutlineOutlined } from "@mui/icons-material";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { jumpDestinations } from "~/utils/design/access/jumpDestinations";
import { stripTags } from "~/utils/design/utils";
import {
  addSkipRule,
  updateSkipRule,
  removeSkipRule,
} from "~/state/design/designState";
import React, { useMemo } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styles from "./SkipLogic.module.css";

function SkipLogic({ code, t }) {
  const dispatch = useDispatch();

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
    <>
      <Typography fontWeight={700}>{t("skip_logic")}</Typography>
      <Divider sx={{ my: 1 }} />

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

          return (
            <Box key={ruleIndex} className={styles.ruleCard}>
              <Box className={styles.ruleHeader}>
                <Typography fontWeight={600}>
                  {t("select_conditions")}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onRemoveRule(ruleIndex)}
                  color="error"
                >
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Box>

              <Autocomplete
                multiple
                noOptionsText={t('logic_builder.no_options')}
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
                    placeholder={
                      selectedOptions.length === 0
                        ? t("select_conditions")
                        : ""
                    }
                  />
                )}
                sx={{ mb: 2 }}
              />

              {invalidSkipDestination ? (
                <Box className={styles.errorDisplay}>
                  <ErrorOutlineOutlined style={{ verticalAlign: "middle" }} />{" "}
                  {t("invalid_skip_destination_err", { code: rule.skipTo })}
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => onDestinationChange(ruleIndex, null)}
                  >
                    {t("ok")}
                  </Button>
                </Box>
              ) : (
                <>
                  <FormControl variant="standard" fullWidth>
                    <Select
                      value={rule.skipTo || ""}
                      displayEmpty
                      onChange={(e) =>
                        onDestinationChange(ruleIndex, e.target.value || null)
                      }
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            ml: "50px",
                          },
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>{t("skip_to")}</em>
                      </MenuItem>
                      {destinations?.map((element) => (
                        <MenuItem key={element.code} value={element.code}>
                          {element.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {rule.skipTo && rule.skipTo.startsWith("G") && (
                    <Box sx={{ mt: 1 }}>
                      <div className={styles.toEnd}>
                        <Typography
                          sx={{
                            color: toEndDisabled
                              ? "grey.500"
                              : "text.primary",
                          }}
                          fontWeight={600}
                        >
                          {t("to_group_end")}
                        </Typography>
                        <Switch
                          disabled={toEndDisabled}
                          checked={rule.toEnd || false}
                          onChange={(event) =>
                            onToEndChange(ruleIndex, event.target.checked)
                          }
                        />
                      </div>
                      <div className={styles.toEnd}>
                        <Typography
                          sx={{
                            color: disqualifyDisabled
                              ? "grey.500"
                              : "text.primary",
                          }}
                          fontWeight={600}
                        >
                          {t("disqualify")}
                        </Typography>
                        <Switch
                          disabled={disqualifyDisabled}
                          checked={rule.disqualify || false}
                          onChange={(event) =>
                            onDisqualifyChange(ruleIndex, event.target.checked)
                          }
                        />
                      </div>
                    </Box>
                  )}
                </>
              )}
            </Box>
          );
        })}

      <Button
        variant="outlined"
        startIcon={<AddOutlined />}
        onClick={onAddRule}
        sx={{ mt: 2 }}
        fullWidth
      >
        {t("add_skip_rule")}
      </Button>
    </>
  );
}

export default SkipLogic;
