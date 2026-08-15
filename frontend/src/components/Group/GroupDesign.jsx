import React, { useRef, useState } from "react";
import QuestionDesign from "~/components/Question/QuestionDesign";
import styles from "./GroupDesign.module.css";
import { useSelector } from "react-redux";
import { QuestionDropArea } from "../design/DropArea/DropArea";
import GroupHeader from "./GroupHeader";
import {
  Box,
  Divider,
  alpha,
  css,
  decomposeColor,
  recomposeColor,
} from "@mui/material";
import { useDrag, useDrop } from "react-dnd";
import { useTheme } from "@emotion/react";
import { useDispatch } from "react-redux";
import { onDrag, setup } from "~/state/design/designState";
import { DESIGN_SURVEY_MODE } from "~/routes";
import { setupOptions } from "~/constants/design";
import { blendColors } from '../Questions/utils';
function GroupDesign({
  t,
  code,
  index,
  designMode,
  lastAddedComponent,
  isLastGroup,
}) {
  const dispatch = useDispatch();
  const group = useSelector((state) => {
    return state.designState[code];
  });

  const langInfo = useSelector((state) => {
    return state.designState.langInfo;
  });

  const [hovered, setHovered] = useState(false);

  const inDesign = designMode == DESIGN_SURVEY_MODE.DESIGN;

  const isInSetup = useSelector((state) => {
    return inDesign && state.designState.setup?.code == code;
  });

  const theme = useTheme();

  const containerRef = useRef();

  const [isDragging, drag, preview] = useDrag({
    type: "groups",
    item: () => {
      return {
        index: index,
        draggableId: code,
        droppableId: "groups",
        type: "groups",
      };
    },
    collect: (monitor) => {
      return monitor.getItem()?.draggableId === code;
    },
  });

  const [collectedProps, drop] = useDrop({
    accept: "groups",
    hover(item, monitor) {
      if (
        !containerRef.current ||
        type == "welcome" ||
        type == "end" ||
        !monitor.isOver({ shallow: true }) ||
        !item ||
        item.droppableId != "groups"
      ) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      const hoverBoundingRect = containerRef.current?.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      if (
        dragIndex < hoverIndex &&
        clientOffset.y < hoverBoundingRect.top + 50
      ) {
        return;
      }
      // Dragging upwards
      if (
        dragIndex > hoverIndex &&
        clientOffset.y > hoverBoundingRect.bottom - 50
      ) {
        return;
      }
      dispatch(
        onDrag({
          type: "reorder_groups",
          id: item.draggableId,
          fromIndex: dragIndex,
          toIndex: hoverIndex,
        }),
      );

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const type = group?.groupType.toLowerCase();

  const children = group?.children;

  const getStyles = (isDragging) => {
    const styles = {
      transition: "all 500ms",
    };

    if (isDragging) {
      styles.opacity = 0.2;
    }

    return styles;
  };

  drop(preview(containerRef));

  const contrastColor = `linear-gradient(
    ${alpha(theme.textStyles.question.color, 0.2)},
    ${alpha(theme.textStyles.question.color, 0.2)}
  ), ${theme.palette.background.paper}`
  const shadowColor = alpha(theme.textStyles.question.color, 0.15);
  const outlineColor = theme.palette.primary.main;

  if (!group) {
    return null;
  }

  const stateClass = isInSetup
    ? styles.groupSetup
    : hovered
    ? styles.groupHovered
    : "";

  const isLastAdded =
    lastAddedComponent?.type === "group" && lastAddedComponent.index === index;
  return (
    <Box
      data-tour={
        type === "end"
          ? "thank-you-page"
          : type !== "welcome" && index === 0
            ? "page-group"
            : undefined
      }
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        if (designMode == DESIGN_SURVEY_MODE.DESIGN) {
          dispatch(setup({ code, rules: setupOptions(type) }));
        }
      }}
      onMouseOver={(e) => {
        if (designMode === DESIGN_SURVEY_MODE.DESIGN) {
          setHovered(
            !e.target.closest(".question") && !e.target.closest(".separator"),
          );
        }
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      className={`${styles.topLevel} ${styles.groupBase} ${stateClass} ${isLastAdded ? styles.highlight : ""}`}
      ref={containerRef}
      style={{
        ...getStyles(isDragging),
        '--qlarr-shadow-color': shadowColor,
        '--qlarr-outline-color': outlineColor,
        '--qlarr-bg-color': theme.palette.background.paper,
        '--qlarr-setup-bg': alpha(theme.textStyles.question.color, 0.2),
        '--qlarr-hover-bg': alpha(theme.textStyles.question.color, 0.05),
      }}
      css={css`
        ${group.customCss || ""}
      `}
    >
      <GroupHeader
        t={t}
        code={code}
        index={index}
        langInfo={langInfo}
        designMode={designMode}
        children={children}
      />

      <>
        {children && children.length > 0 && (
          <QuestionDropArea
            index={0}
            parentCode={code}
            parentType={type}
            parentIndex={index}
            t={t}
          />
        )}
        {children?.map((quest, childIndex) => {
          return (
            <React.Fragment key={quest.code}>
              <QuestionDesign
                t={t}
                key={quest.code}
                parentCode={code}
                parentIndex={index}
                index={childIndex}
                langInfo={langInfo}
                isLast={children.length == childIndex + 1}
                type={quest.type}
                code={quest.code}
                designMode={designMode}
                onMainLang={inDesign}
                lastAddedComponent={lastAddedComponent}
              />
              <QuestionDropArea
                isLast={children.length == childIndex + 1}
                index={childIndex + 1}
                parentIndex={index}
                parentCode={code}
                parentType={type}
                t={t}
              />
              {childIndex < children.length - 1 && (
                <Divider className="separator" />
              )}
            </React.Fragment>
          );
        })}
        {(!children || !children.length) && (
          <QuestionDropArea
            t={t}
            index={0}
            parentCode={code}
            parentType={type}
            emptyGroup={true}
            isLastGroup={isLastGroup}
          />
        )}
      </>
    </Box>
  );
}

export default React.memo(GroupDesign);

function overlay(base, top, topAlpha) {
  const b = decomposeColor(base).values;
  const t = decomposeColor(top).values;
  return recomposeColor({
    type: 'rgb',
    values: b.map((c, i) => Math.round(topAlpha * t[i] + (1 - topAlpha) * c)),
  });
}