import { useEffect, useRef, useMemo } from "react";
import { useStore } from "react-redux";
import { stripTags } from "~/utils/design/utils";
import ReferenceTooltipManager from "./ReferenceTooltipManager";

// A repeat-label reference is a {{...}} instruction containing $repeat_token — the
// only marker that distinguishes it. Match those braces directly so the display
// shows a chip instead of the long raw expression.
const REPEAT_LABEL_INSTRUCTION_PATTERN = /\{\{[^}]*\$repeat_token[^}]*\}\}/g;
const REPEAT_LABEL_TEXT = "Repeat label";

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

  // Process value and replace references with tooltips
  const fixedValue = useMemo(() => {
    let returnValue = value;
    returnValue = returnValue.replace(
      REPEAT_LABEL_INSTRUCTION_PATTERN,
      () => `<span class="repeat-token-chip">${REPEAT_LABEL_TEXT}</span>`,
    );
    instructionList.forEach((element) => {
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
          const OTHER_SUFFIX = "AotherAtext";
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
      const escapedElement = element.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`{{(\\s*)${escapedElement}(\\s*)}}`, 'g');
      returnValue = returnValue.replace(
        regex,
        (match, spacesBefore, spacesAfter) =>
          `<span class="instruction-highlight">{{${spacesBefore}${newElement}${spacesAfter}}}</span>`,
      );
    });
    return returnValue;
  }, [instructionList, index, value]);

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
