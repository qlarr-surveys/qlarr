import React, { useEffect, useRef, useState } from "react";
import ViewCompactIcon from "@mui/icons-material/ViewCompact";

import styles from "./QuestionDesign.module.css";
import ContentEditor from "~/components/design/ContentEditor";
import { alpha, Box, css } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ErrorDisplay from "~/components/design/ErrorDisplay";
import { useSelector } from "react-redux";
import { onDrag, setup } from "~/state/design/designState";
import { useDispatch } from "react-redux";
import { useDrag, useDrop } from "react-dnd";

import ActionToolbar from "~/components/design/ActionToolbar";
import QuestionDesignBody from "./QuestionDesignBody";
import { setupOptions } from "~/constants/design";
import { DESIGN_SURVEY_MODE } from "~/routes";

function QuestionDesign({
  code,
  type,
  isLast,
  parentCode,
  index,
  t,
  langInfo,
  designMode,
  parentIndex,
  lastAddedComponent,
}) {
  console.debug(code + ": " + index);
  const [hovered, setHovered] = useState(false);

  const containerRef = useRef();
  const dispatch = useDispatch();
  const theme = useTheme();

  const isInSetup = useSelector((state) => {
    return state.designState.setup?.code == code;
  });

  const order = useSelector((state) => {
    return state.designState.index[code];
  });

  const question = useSelector((state) => {
    return state.designState[code];
  });

  const [isDragging, drag, preview] = useDrag({
    type: "questions",
    item: {
      index: index,
      draggableId: code,
      droppableId: parentCode,
      parentIndex: parentIndex,
      isLast: isLast,
      type: "questions",
      itemType: type,
    },
    collect: (monitor) => {
      return monitor.getItem()?.draggableId === code;
    },
  });

  const [collectedProps, drop] = useDrop({
    accept: "questions",
    hover(item, monitor) {
      if (
        !containerRef.current ||
        !monitor.isOver({ shallow: true }) ||
        !item ||
        !item.droppableId.startsWith("G")
      ) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;
      // Don't replace items with themselves
      if (dragIndex === hoverIndex || item?.droppableId !== parentCode) {
        return;
      }
      // Determine rectangle on screen
      const hoverBoundingRect = containerRef.current?.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      if (
        dragIndex < hoverIndex &&
        clientOffset.y <
          (2 * hoverBoundingRect.top + hoverBoundingRect.bottom) / 3
      ) {
        return;
      }
      // Dragging upwards
      if (
        dragIndex > hoverIndex &&
        clientOffset.y >
          (hoverBoundingRect.top + 2 * hoverBoundingRect.bottom) / 3
      ) {
        return;
      }
      dispatch(
        onDrag({
          type: "reorder_questions",
          source: item.droppableId,
          destination: parentCode,
          id: item.draggableId,
          fromIndex: dragIndex,
          toIndex: hoverIndex + 1,
        }),
      );

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
      item.isLast = isLast;
    },
  });

  drop(preview(containerRef));

  const contrastColor = alpha(theme.textStyles.question.color, 0.2);
  const hoverColor = alpha(theme.textStyles.question.color, 0.05);
  const textColor = theme.textStyles.question.color;

  useEffect(() => {
    const element = containerRef.current;

    if (
      lastAddedComponent?.type === "question" &&
      lastAddedComponent.groupIndex === parentIndex &&
      lastAddedComponent.questionIndex === index &&
      element
    ) {
      // Delay the addition of the highlight class to ensure the DOM is ready
      const timeoutId = setTimeout(() => {
        element.classList.add(styles.highlight);

        const handleAnimationEnd = () => {
          element.classList.remove(styles.highlight);
        };

        element.addEventListener("animationend", handleAnimationEnd);

        return () => {
          element.removeEventListener("animationend", handleAnimationEnd);
        };
      }, 50);
      // Delay of 50ms to allow DOM rendering

      return () => clearTimeout(timeoutId); // Cleanup timeout on unmount or re-render
    }
  }, [lastAddedComponent, parentIndex, index]);
  const outlineColor = theme.palette.primary.main;

  const stateClass = isInSetup
    ? styles.questionSetup
    : hovered
      ? styles.questionHovered
      : isDragging
        ? styles.questionDragging
        : "";

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        if (designMode == DESIGN_SURVEY_MODE.DESIGN) {
          dispatch(setup({ code, rules: setupOptions(type) }));
        }
      }}
      ref={containerRef}
      onMouseEnter={() => {
        if (designMode == DESIGN_SURVEY_MODE.DESIGN) {
          setHovered(true);
        }
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      className={`question ${isLast ? styles.groupQuestionLast : styles.groupQuestion} ${stateClass}`}
      style={{
        "--qlarr-contrast-color": contrastColor,
        "--qlarr-hover-color": hoverColor,
        "--qlarr-text-color": textColor,
        "--qlarr-outline-color": outlineColor,
        "--qlarr-question-font-size": theme.textStyles.question.size + "px",
      }}
      css={
        question.customCss
          ? css`
              ${question.customCss}
            `
          : undefined
      }
      data-code={code}
    >
      <Box className={styles.contentContainer}>
        {designMode == DESIGN_SURVEY_MODE.DESIGN && (
          <div className={styles.actionToolbarVisible}>
            <ActionToolbar
              isGroup={false}
              code={code}
              parentCode={parentCode}
              showActions={hovered || isInSetup}
            />
          </div>
        )}
        {designMode == DESIGN_SURVEY_MODE.DESIGN && (
          <div className={styles.moveBox} ref={drag}>
            <ViewCompactIcon color="action" />
          </div>
        )}
      </Box>

      <Box className={styles.titleContainer}>
        <span style={{ width: "max-content", fontWeight: "bolder" }}>
          {order}.
        </span>
        <div className={styles.titleQuestion}>
          <ContentEditor
            code={code}
            editable={
              designMode == DESIGN_SURVEY_MODE.DESIGN ||
              designMode == DESIGN_SURVEY_MODE.LANGUAGES
            }
            extended={true}
            placeholder={t("content_editor_placeholder_title", {
              lng: langInfo.mainLang,
            })}
            contentKey="label"
            required={
              question.validation?.validation_required?.isActive ||
              question.validation?.validation_min_option_count?.isActive ||
              question.validation?.validation_min_ranking_count?.isActive
            }
          />
        </div>
      </Box>

      {question.showDescription && (
        <Box className={styles.textDescriptionContent}>
          <ContentEditor
            code={code}
            editable={
              designMode == DESIGN_SURVEY_MODE.DESIGN ||
              designMode == DESIGN_SURVEY_MODE.LANGUAGES
            }
            extended={true}
            placeholder={t("content_editor_placeholder_description", {
              lng: langInfo.mainLang,
            })}
            contentKey="description"
          />
        </Box>
      )}

      {!isDragging && (
        <QuestionDesignBody
          code={code}
          type={type}
          t={t}
          designMode={designMode}
          langInfo={langInfo}
        />
      )}
      <ErrorDisplay code={code} />
    </div>
  );
}

export default React.memo(QuestionDesign);
