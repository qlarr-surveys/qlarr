import { useEffect, useRef, useMemo } from "react";
import { useSelector, useStore } from "react-redux";
import { stripTags } from "~/utils/design/utils";
import ReferenceTooltipManager from "./ReferenceTooltipManager";

// A repeat-label reference is a {{...}} instruction containing $repeat_token — the
// only marker that distinguishes it. Match those braces directly so the display
// shows a chip instead of the long raw expression.
const REPEAT_LABEL_INSTRUCTION_PATTERN = /\{\{[^}]*\$repeat_token[^}]*\}\}/g;
const REPEAT_LABEL_TEXT = "Repeat label";

// A simple pipe — the whole instruction is one reference, e.g. "Q318icxA1.value"
// (what the @ menu inserts). Anything else (an expression) keeps the raw view.
const SIMPLE_PIPE_PATTERN = /^\s*(Q[a-z0-9_]+)((?:A[A-Za-z0-9_]*)?)\.([a-z0-9_]+)\s*$/;
const OTHER_SUFFIX = "AotherAtext";

const escapeHtml = (text) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Chip text for a simple pipe: the question's number, plus the answer's label
// (main language) for an answer-level reference — "Q3 · City", "Q4". An
// unlabelled answer shows its own code (A1); the "other" write-in shows the
// "other" option's label.
const simplePipeLabel = (designState, questionCode, answerPart, mainLang) => {
  const questionIndex = designState.index?.[questionCode];
  if (!questionIndex) return null;
  if (!answerPart) return questionIndex;
  const label = (code) =>
    stripTags(designState[code]?.content?.[mainLang]?.label || "").trim();
  const answerLabel =
    answerPart === OTHER_SUFFIX
      ? label(questionCode + "Aother") || "Other"
      : label(questionCode + answerPart) || answerPart;
  return `${questionIndex} · ${answerLabel}`;
};

export const useReferenceTooltips = ({
  rawInstructionList,
  contentKey,
  lang,
  value,
  index,
  mainLang,
  isActive,
  renderedContentRef,
}) => {
  const store = useStore();
  const tooltipManagerRef = useRef(null);

  // Extract instruction list
  const instructionList = useMemo(() => {
    return isActive
      ? []
      : rawInstructionList
          .filter((i) => i.code.startsWith(`format_${contentKey}_${lang}`))
          .map((i) => i.text);
  }, [rawInstructionList, contentKey, lang, isActive]);

  // Chip text per simple pipe, kept in a selector so renaming a question or an
  // answer updates the chips.
  const simplePipeLabelsKey = useSelector((state) =>
    JSON.stringify(
      instructionList.map((element) => {
        const match = element.match(SIMPLE_PIPE_PATTERN);
        return match
          ? simplePipeLabel(state.designState, match[1], match[2], mainLang)
          : null;
      })
    )
  );

  // Process value and replace references with tooltips
  const fixedValue = useMemo(() => {
    const simplePipeLabels = JSON.parse(simplePipeLabelsKey);
    let returnValue = value;
    returnValue = returnValue.replace(
      REPEAT_LABEL_INSTRUCTION_PATTERN,
      () => `<span class="repeat-token-chip">${REPEAT_LABEL_TEXT}</span>`,
    );
    instructionList.forEach((element, i) => {
      const escapedElement = element.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`{{(\\s*)${escapedElement}(\\s*)}}`, 'g');
      const simpleLabel = simplePipeLabels[i];
      if (simpleLabel) {
        const questionCode = element.match(SIMPLE_PIPE_PATTERN)[1];
        returnValue = returnValue.replace(
          regex,
          () =>
            `<span class="instruction-highlight"><span class="reference-tooltip" data-original="${questionCode}">${escapeHtml(simpleLabel)}</span></span>`,
        );
        return;
      }
      let newElement = element;
      const pattern = /([QGS][a-zA-Z0-9_]*)\.([a-z0-9_]+)/g;
      const matches = [...element.matchAll(pattern)];
      if (matches.length > 0) {
        matches.forEach((match) => {
          const fullMatch = match[0]; // e.g., "Q1.value"
          const prefix = match[1]; // e.g., "Q1"
          const suffix = match[2]; // e.g., "value"
          // Carry-forward "other" pipes in as a compound code like
          // "Q1AotherAtext.value". There's no index entry for the compound, so
          // resolve it to the source question and show a friendly "Q1.other".
          const isOther = prefix.endsWith(OTHER_SUFFIX);
          const basePrefix = isOther
            ? prefix.slice(0, -OTHER_SUFFIX.length)
            : prefix;
          const toReplace = index[basePrefix];
          if (toReplace) {
            const display = isOther ? `${toReplace}.other` : `${toReplace}.${suffix}`;
            newElement = newElement.replace(
              fullMatch,
              `<span class="reference-tooltip" data-original="${basePrefix}">${display}</span>`,
            );
          }
        });
      }
      returnValue = returnValue.replace(
        regex,
        (match, spacesBefore, spacesAfter) =>
          `<span class="instruction-highlight">{{${spacesBefore}${newElement}${spacesAfter}}}</span>`,
      );
    });
    return returnValue;
  }, [instructionList, index, value, simplePipeLabelsKey]);

  // Initialize and update reference tooltips
  useEffect(() => {
    if (!tooltipManagerRef.current) {
      // Callback to fetch question content from Redux based on question ID
      const getQuestionContent = (questionId) => {
        const designState = store.getState().designState;
        return (
          designState.index[questionId] +
          ". " +
          stripTags(
            designState[questionId]?.content?.[mainLang]?.label || questionId,
          )
        );
      };

      tooltipManagerRef.current = new ReferenceTooltipManager(
        getQuestionContent,
      );
    }

    if (!isActive && renderedContentRef.current) {
      tooltipManagerRef.current.updateTooltips(renderedContentRef.current);
    }

    return () => {
      if (isActive && tooltipManagerRef.current) {
        tooltipManagerRef.current.destroy();
      }
    };
  }, [fixedValue, isActive, store, mainLang, renderedContentRef]);

  return { fixedValue, instructionList };
};
