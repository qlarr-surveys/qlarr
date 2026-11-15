import React, { useId } from "react";
import { useDispatch, useSelector } from "react-redux";
import { changeAttribute, updatePriority } from "~/state/design/designState";
import { instructionByCode } from "@qlarr/design-core/state/addInstructions";
import { stripTags } from "~/utils/design/utils";
import {
  SetupCheckItem,
  SetupCheckList,
  SetupField,
  SetupSegmented,
  SetupSelect,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";
import OrderPriorityError from "../OrderPriorityError";
import errorStyles from "~/components/design/ErrorDisplay/ErrorDisplay.module.css";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

const clampLimit = (limit, size) =>
  Math.min(Math.max(limit ?? size - 1, 1), size - 1);

// rule -> { title i18n key, child `type` filter (rows/columns only) }
const RULE_CONFIG = {
  prioritise_questions: { title: "questions_priority" },
  prioritise_groups: { title: "groups_priority" },
  prioritise_options: { title: "options_priority" },
  prioritise_rows: { title: "rows_priority", type: "row" },
  prioritise_columns: { title: "columns_priority", type: "column" },
};

export default function PrioritySetup({ t, rule, code }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const headingId = useId();
  const limitId = useId();

  const { title, type } = RULE_CONFIG[rule] || {};
  const isGroups = rule === "prioritise_groups";

  const value = useSelector((state) => state.designState[code][rule] || "NONE");

  const instruction = useSelector((state) =>
    instructionByCode(state.designState[code], "priority_groups")
  );
  const priorities = instruction?.priorities || [];
  const errors = instruction?.errors || [];

  const rawChildren = useSelector((state) => {
    const comp = state.designState[code];
    const lang = state.designState.langInfo.lang;
    return (comp?.children || [])
      .filter((el) => (type ? el.type === type : true))
      .filter((el) => {
        const groupType = el.groupType?.toLowerCase();
        return !(groupType === "end" || (isGroups && groupType === "welcome"));
      })
      .map((el) => ({
        code: el.code,
        label: state.designState[el.qualifiedCode]?.content?.[lang]?.label,
      }));
  });

  // For rows/columns the instruction holds one group per axis, so pick the
  // group relevant to this axis and keep the others (the other axis) intact.
  const axisCodes = rawChildren.map((c) => c.code);
  const relevantGroup = type
    ? priorities.find((g) =>
        (g.weights || []).some((w) => axisCodes.includes(w.code))
      )
    : priorities[0];
  const otherGroups = type
    ? priorities.filter((g) => g !== relevantGroup)
    : [];

  // Local selection state: a priority group needs >= 2 items, so the instruction
  // isn't written until then. Keeping the checkbox state here lets the user build
  // the selection back up from 0/1 without it being dropped each click.
  const [selectedCodes, setSelectedCodes] = React.useState(() =>
    (relevantGroup?.weights || []).map((w) => w.code)
  );
  // Re-seed when prioritisation is toggled on/off (initialSetup populates the
  // group). Switching component or axis remounts this via the SetupPanel
  // key={code+rule} (for arrays the rows and columns instances render side by
  // side as distinct keys), so `value` is the only in-place change to react to.
  React.useEffect(() => {
    setSelectedCodes((relevantGroup?.weights || []).map((w) => w.code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const children = rawChildren.map((c) => ({
    ...c,
    inGroup: selectedCodes.includes(c.code),
  }));
  const selectedCount = children.filter((c) => c.inGroup).length;
  const effectiveLimit = clampLimit(relevantGroup?.limit, selectedCount);

  const commitCodes = (codes, nextLimit) => {
    const validCodes = codes.filter((c) => axisCodes.includes(c));
    const nextPriorities =
      validCodes.length < 2
        ? otherGroups
        : [
            ...otherGroups,
            {
              // v1 uses equal weights — store member codes + a "show N of M" limit
              weights: validCodes.map((c) => ({ code: c })),
              limit: clampLimit(nextLimit, validCodes.length),
            },
          ];
    dispatch(updatePriority({ code, priorities: nextPriorities }));
  };

  const onToggle = (next) => {
    dispatch(
      changeAttribute({ code, key: rule, value: next === "NONE" ? undefined : next })
    );
  };

  const onCheck = (childCode, checked) => {
    const next = checked
      ? [...selectedCodes, childCode]
      : selectedCodes.filter((c) => c !== childCode);
    setSelectedCodes(next);
    commitCodes(next, relevantGroup?.limit);
  };

  const heading = type ? t(title) : t("op_priority_section");

  return (
    <SetupField label={heading} help={help(title)} id={headingId}>
      <div className={setupFieldStyles.stack}>
        <SetupSegmented
          labelledBy={headingId}
          options={[
            { value: "NONE", label: t("no_priority") },
            { value: "PRIORITY", label: t("prioritise") },
          ]}
          value={value}
          onChange={onToggle}
        />

        {value !== "NONE" && (
          <div className={setupFieldStyles.panelBox}>
            <SetupCheckList label={heading}>
              {children.map((item) => (
                <SetupCheckItem
                  key={item.code}
                  code={item.code}
                  text={stripTags(item.label)}
                  checked={item.inGroup}
                  onChange={(checked) => onCheck(item.code, checked)}
                />
              ))}
            </SetupCheckList>

            {selectedCount >= 2 ? (
              <div className={setupFieldStyles.sentence}>
                <label htmlFor={limitId}>{t("priority_show")}</label>
                <SetupSelect
                  id={limitId}
                  inline
                  value={effectiveLimit}
                  onChange={(e) =>
                    commitCodes(selectedCodes, Number(e.target.value))
                  }
                >
                  {Array.from(
                    { length: selectedCount - 1 },
                    (_, i) => i + 1
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </SetupSelect>
                <span>{t("priority_of_count", { count: selectedCount })}</span>
              </div>
            ) : (
              <div className={errorStyles.errorDisplay}>
                <div className={errorStyles.errorItem}>
                  <ErrorOutlineIcon style={{ verticalAlign: "middle" }} />
                  <span className={errorStyles.errorMessage}>
                    {t("priority_min_items")}
                  </span>
                </div>
              </div>
            )}

            <OrderPriorityError errors={errors} />
          </div>
        )}
      </div>
    </SetupField>
  );
}
