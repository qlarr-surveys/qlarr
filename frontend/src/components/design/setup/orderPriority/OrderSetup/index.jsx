import React from "react";
import { Checkbox, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { shallowEqual, useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { changeAttribute, updateRandom } from "~/state/design/designState";
import styles from "./OrderSetup.module.css";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { instructionByCode } from "~/state/design/addInstructions";
import { stripTags } from "~/utils/design/utils";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

export default function OrderSetup({ t, rule, code }) {
  const dispatch = useDispatch();
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);

  const value = useSelector((state) => {
    return state.designState[code][rule] || "NONE";
  });

  let title = "";
  let type = undefined;
  let labels = [];
  let values = [];

  switch (rule) {
    case "randomize_questions":
      title = "questions_order";
      labels = [t("as_is"), t("random_order")];
      values = ["NONE", "RANDOM"];
      break;
    case "randomize_groups":
      title = "groups_order";
      labels = [t("as_is"), t("random_order")];
      values = ["NONE", "RANDOM"];
      break;
    case "randomize_options":
      title = "options_order";
      labels = [
        t("as_is"),
        t("random_order"),
        t("flip_order"),
        t("sort_by_label"),
      ];
      values = ["NONE", "RANDOM", "FLIP", "ALPHA"];
      break;
    case "randomize_rows":
      title = "rows_order";
      type = "row";
      labels = [
        t("as_is"),
        t("random_order"),
        t("flip_order"),
        t("sort_by_label"),
      ];
      values = ["NONE", "RANDOM", "FLIP", "ALPHA"];
      break;
    case "randomize_columns":
      title = "columns_order";
      type = "column";
      labels = [
        t("as_is"),
        t("random_order"),
        t("flip_order"),
        t("sort_by_label"),
      ];
      values = ["NONE", "RANDOM", "FLIP", "ALPHA"];
      break;
  }

  const state = useSelector((state) => {
    return state.designState[code];
  });

  const lang = useSelector((state) => {
    return state.designState.langInfo.lang;
  });

  const childrenCodes = useSelector(
    (state) =>
      (state.designState[code]?.children || [])
        .filter((el) => (type ? el.type === type : true))
        .filter((el) => el.groupType?.toLowerCase() !== "end")
        .map((el) => el.code),
    shallowEqual
  );

  const randomInstruction = instructionByCode(state, "random_group");
  const randomGroups = randomInstruction?.groups || [];

  const relevantGroup = type
    ? randomGroups.filter((group) => {
        return group.codes.some((code) => childrenCodes.indexOf(code) > -1);
      })?.[0]
    : randomGroups[0];

  const otherGroups = type
    ? randomGroups.filter(
        (group) => !group.codes.some((code) => childrenCodes.indexOf(code) > -1)
      )?.[0]
    : undefined;

  const randomGroupCodes = relevantGroup?.codes || [];

  const children = useSelector((state) => {
    return (
      state.designState[code]?.children
        ?.filter((el) => (type ? el.type == type : true))
        ?.filter((el) => el.groupType?.toLowerCase() != "end")
        ?.map((el) => {
          return {
            code: el.code,
            label: state.designState[el.qualifiedCode].content?.[lang]?.label,
            inRandomGroup: randomGroupCodes.includes(el.code),
          };
        }) || []
    );
  });

  const reorderedCount = children.filter((c) => c.inRandomGroup).length;
  const pinnedCount = children.length - reorderedCount;

  const handleCheckboxChange = (checked, checkedIndex) => {
    const childCodes = children
      .filter(
        (child, index) =>
          (index != checkedIndex && child.inRandomGroup) ||
          (index == checkedIndex && checked)
      )
      .map((child) => child.code);

    if (childCodes.length == 0) {
      onChange("NONE");
      return;
    }

    const newGroup = {
      codes: childCodes,
      randomOption: value,
    };

    const groups = type ? [newGroup, otherGroups].filter(group => group !== undefined) : [newGroup];
    dispatch(updateRandom({ code, groups }));
  };

  const onChange = (value) => {
    const finalValue = value == "NONE" ? undefined : value;
    dispatch(changeAttribute({ code, key: rule, value: finalValue }));
  };

  return (
    <>
      <div className={styles.label}>
        <CustomTooltip body={tTooltips(title)} />
        <Typography fontWeight={700}>
          {type ? t(title) : t("op_order_section")}
        </Typography>
      </div>

      <ToggleButtonGroup
        className={styles.modeGroup}
        size="small"
        exclusive
        value={value}
        onChange={(_e, next) => {
          if (next !== null) onChange(next);
        }}
      >
        {values.map((val, index) => (
          <ToggleButton key={val} value={val}>
            {labels[index]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {value != "NONE" && value != undefined && (
        <>
          <Typography
            className={styles.summary}
            variant="body2"
            color="text.secondary"
          >
            {pinnedCount === 0
              ? t("order_applies_all", { count: children.length })
              : t("order_pinned_some", {
                  count: pinnedCount,
                  total: children.length,
                })}
          </Typography>
          <ul className={styles.list}>
            {children &&
              children.map((item, index) => (
                <RandomisedChildDisplay
                  key={index}
                  code={item.code}
                  handleChange={(checked) => handleCheckboxChange(checked, index)}
                  checked={item.inRandomGroup}
                  label={item.label}
                />
              ))}
          </ul>
          <Typography
            className={styles.hint}
            variant="body2"
            color="text.secondary"
          >
            {t("op_fixed_hint")}
          </Typography>
        </>
      )}
    </>
  );
}

function RandomisedChildDisplay({ code, label, checked, handleChange }) {
  const text = stripTags(label);
  return (
    <li className={styles.listItem} onClick={() => handleChange(!checked)}>
      <Checkbox
        checked={checked}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => handleChange(e.target.checked)}
      />
      <span className={styles.codeChip} title={code}>
        {code}
      </span>
      <span className={styles.itemLabel} title={text}>
        {text}
      </span>
    </li>
  );
}
