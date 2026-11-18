import React, { useId } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronDown, ChevronUp } from "lucide-react";
import { isDisplay } from "~/components/Questions/utils";
import { onDrag } from "~/state/design/designState";
import {
  groupTypeOf,
  isEquivalent,
  pageLabels,
  stripTags,
} from "~/utils/design/utils";
import {
  SetupField,
  SetupIconButton,
  SetupLabel,
  SetupSelect,
  setupFieldStyles,
} from "~/components/design/setup/SetupFields";
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
  const selectId = useId();
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

  // One option per landing spot, grouped by page: a page's first option is
  // its top, each other one is right after a question. The moved question
  // itself is left out. A page the question can't go to is greyed out.
  const pageNames = pageLabels(pages, t);
  const questionName = (question) =>
    question.label
      ? `${question.displayCode}. ${question.label}`
      : question.displayCode;
  const groups = pages.map((target, i) => ({
    code: target.code,
    name: pageNames[i],
    disabled: !accepts(target),
    options: [
      {
        value: target.code,
        page: target.code,
        position: 0,
        text: `${pageNames[i]} · ${t("move_question_top")}`,
      },
      ...target.questions
        .filter((question) => question.code !== code)
        .map((question, j) => ({
          value: question.code,
          page: target.code,
          position: j + 1,
          text: t("move_question_after", { question: questionName(question) }),
        })),
    ],
  }));
  const options = groups.flatMap((group) => group.options);
  const current = isFirst ? page.code : others[position - 1].code;

  const onChange = (e) => {
    const option = options.find((o) => o.value === e.target.value);
    if (option && option.value !== current) {
      moveTo(option.page, option.position);
    }
  };

  return (
    <div className={styles.moveQuestion}>
      <SetupLabel label={t("move_question")}>
        <span className={setupFieldStyles.actions}>
          <SetupIconButton
            label={t("move_question_up")}
            icon={ChevronUp}
            disabled={!canMoveUp}
            onClick={moveUp}
          />
          <SetupIconButton
            label={t("move_question_down")}
            icon={ChevronDown}
            disabled={!canMoveDown}
            onClick={moveDown}
          />
        </span>
      </SetupLabel>
      <SetupField label={t("move_question_position")} htmlFor={selectId}>
        <SetupSelect id={selectId} value={current} onChange={onChange}>
          {groups.map((group) => (
            <optgroup
              key={group.code}
              label={group.name}
              disabled={group.disabled}
            >
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.text}
                </option>
              ))}
            </optgroup>
          ))}
        </SetupSelect>
      </SetupField>
    </div>
  );
}
