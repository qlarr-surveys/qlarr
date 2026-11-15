import React, { useMemo, useCallback, useId } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  accessibleDependencies,
  isArrayType,
  CARRY_FORWARD_SOURCE_TYPES,
} from "@qlarr/design-core";
import { stripTags } from "~/utils/design/utils";
import {
  enableCarryForward,
  updateCarryForward,
  disableCarryForward,
} from "~/state/design/designState";
import {
  SetupField,
  SetupSegmented,
  SetupSelect,
  SetupSubToggle,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

const cx = (...names) => names.filter(Boolean).join(" ");

// Config editor for one axis of a target ("rows" for choice/ranking/text
// targets; "rows" and "columns" for arrays). Dispatches the design-core carry
// forward mutations, which materialize + keep the options in sync.
function AxisConfig({ code, axis, axisLabel, sources, hasOtherFor, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const selectId = useId();
  const config = useSelector((s) => s.designState[code]?.carryForward?.[axis]);
  const sourceCode = config?.sourceCode || "";
  const mode = config?.mode || "selected";
  const carryOther = !!config?.carryOther;
  const sourceHasOther = sourceCode ? hasOtherFor(sourceCode) : false;

  const onSource = (e) => {
    const value = e.target.value;
    if (!value) {
      dispatch(disableCarryForward({ targetCode: code, axis }));
    } else if (config) {
      dispatch(updateCarryForward({ targetCode: code, axis, sourceCode: value }));
    } else {
      dispatch(
        enableCarryForward({
          targetCode: code,
          sourceCode: value,
          axis,
          mode: "selected",
          carryOther: false,
        }),
      );
    }
  };

  const onMode = (value) => {
    if (value) dispatch(updateCarryForward({ targetCode: code, axis, mode: value }));
  };

  const onCarryOther = (checked) =>
    dispatch(updateCarryForward({ targetCode: code, axis, carryOther: checked }));

  return (
    <SetupField label={axisLabel} help={help("carry_forward")} htmlFor={selectId}>
      <div className={setupFieldStyles.stack}>
        <SetupSelect id={selectId} value={sourceCode} onChange={onSource}>
          <option value="">{t("carry_source_placeholder")}</option>
          {sources.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </SetupSelect>

        {config && (
          <>
            <SetupSegmented
              label={axisLabel}
              options={[
                { value: "selected", label: t("carry_mode_selected") },
                { value: "unselected", label: t("carry_mode_unselected") },
              ]}
              value={mode}
              onChange={onMode}
            />

            {mode === "selected" && sourceHasOther && (
              <SetupSubToggle
                label={t("carry_other")}
                checked={carryOther}
                onChange={onCarryOther}
              />
            )}

            <button
              type="button"
              onClick={() =>
                dispatch(disableCarryForward({ targetCode: code, axis }))
              }
              className={cx(
                setupFieldStyles.textLink,
                setupFieldStyles.textLinkDanger
              )}
            >
              {t("carry_remove")}
            </button>
          </>
        )}
      </div>
    </SetupField>
  );
}

function CarryForward({ code, t }) {
  const designState = useSelector((s) => s.designState);
  const state = designState[code];
  const isArray = isArrayType(state?.type);
  const index = designState.index || {};
  const mainLang = designState.langInfo?.mainLang;

  const sources = useMemo(() => {
    const deps = accessibleDependencies(designState.componentIndex, code) || [];
    return deps
      .filter((dep) => CARRY_FORWARD_SOURCE_TYPES.includes(designState[dep]?.type))
      .map((dep) => ({
        code: dep,
        label: `${index[dep] || ""}. ${stripTags(
          designState[dep]?.content?.[mainLang]?.label || "",
        )}`,
      }));
  }, [designState, code, index, mainLang]);

  const hasOtherFor = useCallback(
    (src) =>
      (designState[src]?.children || []).some(
        (c) => designState[c.qualifiedCode]?.type === "other",
      ),
    [designState],
  );

  // No eligible source → the rule is filtered out of the setup panel upstream
  // (SetupPanel), so this is just a defensive guard.
  if (!sources.length) {
    return null;
  }

  return (
    <div className={cx(setupFieldStyles.stack, setupFieldStyles.stackLoose)}>
      {isArray ? (
        <>
          <AxisConfig
            code={code}
            axis="rows"
            axisLabel={t("carry_from_rows")}
            sources={sources}
            hasOtherFor={hasOtherFor}
            t={t}
          />
          <AxisConfig
            code={code}
            axis="columns"
            axisLabel={t("carry_from_columns")}
            sources={sources}
            hasOtherFor={hasOtherFor}
            t={t}
          />
        </>
      ) : (
        <AxisConfig
          code={code}
          axis="rows"
          axisLabel={t("carry_from")}
          sources={sources}
          hasOtherFor={hasOtherFor}
          t={t}
        />
      )}
    </div>
  );
}

export default CarryForward;
