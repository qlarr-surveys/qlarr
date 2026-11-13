import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { IconButton, MenuItem, Select, Typography } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { isDisplay, questionIconByType } from "~/components/Questions/utils";
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
      type: design[question.code]?.type,
      displayCode: design.index?.[question.code] || question.code,
      label: labelOf(question.code),
    })),
  }));
};

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

  // Moving across pages too: reorder_questions inserts at toIndex - 1 of the
  // destination once the question is out of its source page.
  const moveTo = (destination, toPosition) =>
    dispatch(
      onDrag({
        type: "reorder_questions",
        source: page.code,
        destination,
        id: code,
        fromIndex: position,
        toIndex: toPosition + 1,
        reveal: true,
      })
    );
  const reorder = (toPosition) => moveTo(page.code, toPosition);

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

  // One option per landing spot: a page means its top, a question means
  // right after it. The moved question itself is left out.
  const pageNames = pageLabels(pages, t);
  const options = pages.flatMap((target, i) => {
    const disabled = !accepts(target);
    const questions = target.questions.filter(
      (question) => question.code !== code
    );
    return [
      {
        value: target.code,
        page: target.code,
        position: 0,
        isPage: true,
        disabled,
        displayCode: pageNames[i],
        label: target.label,
      },
      ...questions.map((question, j) => ({
        ...question,
        value: question.code,
        page: target.code,
        position: j + 1,
        disabled,
      })),
    ];
  });
  const current = isFirst ? page.code : others[position - 1].code;

  const onChange = (e) => {
    const option = options.find((o) => o.value === e.target.value);
    if (option && option.value !== current) {
      moveTo(option.page, option.position);
    }
  };

  const renderOption = (option) => (
    <span className={styles.option}>
      <Typography component="span" variant="body2" color="text.secondary">
        {t(
          option.isPage
            ? "move_question_before_prefix"
            : "move_question_after_prefix"
        )}
      </Typography>
      <span className={styles.optionIcon}>
        {option.isPage ? (
          <FormatListBulletedIcon fontSize="small" />
        ) : (
          questionIconByType(option.type)
        )}
      </span>
      <Typography component="span" variant="body2" className={styles.optionCode}>
        {option.displayCode}
      </Typography>
      <Typography
        component="span"
        variant="body2"
        color="text.secondary"
        noWrap
        className={styles.optionLabel}
      >
        {option.label}
      </Typography>
    </span>
  );

  const renderValue = (value) => {
    const option = options.find((o) => o.value === value);
    if (!option) return null;
    const text = option.isPage
      ? `${option.displayCode} · ${t("move_question_top")}`
      : t("move_question_after", {
          question: option.label
            ? `${option.displayCode}. ${option.label}`
            : option.displayCode,
        });
    return (
      <span className={styles.option}>
        <span className={styles.optionIcon}>
          {option.isPage ? (
            <FormatListBulletedIcon fontSize="small" />
          ) : (
            questionIconByType(option.type)
          )}
        </span>
        <Typography component="span" variant="body2" noWrap className={styles.optionLabel}>
          {text}
        </Typography>
      </span>
    );
  };

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
        {t("move_question_position")}
      </Typography>
      <Select
        size="small"
        fullWidth
        value={current}
        onChange={onChange}
        renderValue={renderValue}
        inputProps={{ "aria-label": t("move_question_position") }}
        MenuProps={{ PaperProps: { sx: { maxWidth: 420 } } }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            sx={option.isPage ? undefined : { paddingInlineStart: 4 }}
          >
            {renderOption(option)}
          </MenuItem>
        ))}
      </Select>
    </div>
  );
}
