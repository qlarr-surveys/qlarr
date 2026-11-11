import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { IconButton, MenuItem, Select, Typography } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { isDisplay } from "~/components/Questions/utils";
import { onDrag } from "~/state/design/designState";
import {
  groupTypeOf,
  isEquivalent,
  pageLabels,
  stripTags,
} from "~/utils/design/utils";
import styles from "./MoveQuestion.module.css";

const selectPages = (state) => {
  const design = state.designState;
  const lang = design.langInfo?.mainLang;
  const labelOf = (code) =>
    stripTags(design[code]?.content?.[lang]?.label || "").trim();
  return (design.Survey?.children || []).map((group) => ({
    code: group.code,
    type: groupTypeOf(group),
    label: labelOf(group.code),
    questions: (design[group.code]?.children || []).map((question) => ({
      code: question.code,
      displayCode: design.index?.[question.code] || question.code,
      label: labelOf(question.code),
    })),
  }));
};

const TOP = "top";

export default function MoveQuestion({ code, t }) {
  const dispatch = useDispatch();
  const pages = useSelector(selectPages, isEquivalent);
  const type = useSelector((state) => state.designState[code]?.type);

  const pageIndex = pages.findIndex((page) =>
    page.questions.some((question) => question.code === code)
  );
  if (pageIndex === -1) return null;

  const page = pages[pageIndex];
  const position = page.questions.findIndex(
    (question) => question.code === code
  );
  const others = page.questions.filter((question) => question.code !== code);

  const accepts = (target) => target.type !== "end" || isDisplay(type);
  const neighbourPage = (step) => {
    const target = pages[pageIndex + step];
    return target && accepts(target) ? target : null;
  };
  const previousPage = neighbourPage(-1);
  const nextPage = neighbourPage(1);

  const reorder = (toPosition) =>
    dispatch(
      onDrag({
        type: "reorder_questions",
        source: page.code,
        destination: page.code,
        id: code,
        fromIndex: position,
        toIndex: toPosition + 1,
        reveal: true,
      })
    );

  const reparent = (destination) =>
    dispatch(
      onDrag({
        type: "reparent_question",
        source: page.code,
        destination,
        id: code,
        reveal: true,
      })
    );

  const isFirst = position === 0;
  const isLast = position === page.questions.length - 1;
  const canMoveUp = !isFirst || !!previousPage;
  const canMoveDown = !isLast || !!nextPage;

  const moveUp = (e) => {
    e?.stopPropagation();
    if (!isFirst) reorder(position - 1);
    else if (previousPage) reparent(previousPage.code);
  };

  const moveDown = (e) => {
    e?.stopPropagation();
    if (!isLast) reorder(position + 1);
    else if (nextPage) reparent(nextPage.code);
  };

  const onPageChange = (e) => {
    if (e.target.value !== page.code) reparent(e.target.value);
  };

  const onPositionChange = (e) => {
    const value = e.target.value;
    reorder(
      value === TOP
        ? 0
        : others.findIndex((question) => question.code === value) + 1
    );
  };

  const pageNames = pageLabels(pages, t);
  const pageLabel = (target, i) =>
    target.label ? `${pageNames[i]} · ${target.label}` : pageNames[i];

  const questionLabel = (question) =>
    question.label
      ? `${question.displayCode}. ${question.label}`
      : question.displayCode;

  return (
    <div className={styles.moveQuestion}>
      <div className={styles.moveRow}>
        <Typography fontWeight={700}>{t("move_question")}</Typography>
        <div className={styles.actions}>
          <CustomTooltip title={t("move_question_up")} showIcon={false}>
            <span>
              <IconButton
                size="small"
                disabled={!canMoveUp}
                onClick={moveUp}
                aria-label={t("move_question_up")}
              >
                <KeyboardArrowUpIcon />
              </IconButton>
            </span>
          </CustomTooltip>
          <CustomTooltip title={t("move_question_down")} showIcon={false}>
            <span>
              <IconButton
                size="small"
                disabled={!canMoveDown}
                onClick={moveDown}
                aria-label={t("move_question_down")}
              >
                <KeyboardArrowDownIcon />
              </IconButton>
            </span>
          </CustomTooltip>
        </div>
      </div>

      <Typography fontWeight={700} variant="body2" sx={{ mb: 0.5 }}>
        {t("move_question_page")}
      </Typography>
      <Select
        size="small"
        fullWidth
        value={page.code}
        onChange={onPageChange}
        inputProps={{ "aria-label": t("move_question_page") }}
        MenuProps={{ PaperProps: { sx: { maxWidth: 360 } } }}
      >
        {pages.map((target, i) => (
          <MenuItem
            key={target.code}
            value={target.code}
            disabled={!accepts(target)}
          >
            <span className={styles.optionLabel}>{pageLabel(target, i)}</span>
          </MenuItem>
        ))}
      </Select>

      <Typography fontWeight={700} variant="body2" sx={{ mb: 0.5 }}>
        {t("move_question_position")}
      </Typography>
      <Select
        size="small"
        fullWidth
        value={isFirst ? TOP : others[position - 1].code}
        onChange={onPositionChange}
        inputProps={{ "aria-label": t("move_question_position") }}
        MenuProps={{ PaperProps: { sx: { maxWidth: 360 } } }}
      >
        <MenuItem value={TOP}>{t("move_question_top")}</MenuItem>
        {others.map((question) => (
          <MenuItem key={question.code} value={question.code}>
            <span className={styles.optionLabel}>
              {t("move_question_after", { question: questionLabel(question) })}
            </span>
          </MenuItem>
        ))}
      </Select>
    </div>
  );
}
