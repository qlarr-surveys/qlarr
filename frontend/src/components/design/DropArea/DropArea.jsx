import styles from "./DropArea.module.css";
import { useDrop } from "react-dnd";
import { onDrag } from "~/state/design/designState";
import { useDispatch } from "react-redux";
import { useTheme } from "@emotion/react";
import { useSelector } from "react-redux";
import { getContrastColor, isDisplay } from "~/components/Questions/utils";
import { useInView } from "react-intersection-observer";
import { Box } from "@mui/material";
import { HelpOutline } from "@mui/icons-material";
import { inDesign } from "~/routes";
import dragIcon from "~/assets/icons/drag.svg";
import addTextIcon from "~/assets/icons/add-text.svg";
import addImageIcon from "~/assets/icons/add-image.svg";
import addVideoIcon from "~/assets/icons/add-video.svg";
import { Trans } from "react-i18next";

export function GroupDropArea({ index, groupsCount, t, emptySurvey }) {
  const dispatch = useDispatch();

  const [{ isOver, item }, drop] = useDrop(
    () => ({
      accept: "groups",
      drop: (item) => {
        dispatch(
          onDrag({
            type: "new_group",
            groupType: item.draggableId,
            toIndex: index,
          })
        );
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        item: monitor.getItem(),
      }),
    }),
    [index]
  );
  const isDraggingGroup = item != null && item.draggableId == "group";

  const canDrop =
    item &&
    item.droppableId == "new-groups" &&
    canDropWelcomeGroup(item, index) &&
    canDropEndGroup(item, index, groupsCount) &&
    canSortGroup(item, index);
  const theme = useTheme();

  const contrastColor = getContrastColor(theme.palette.background.paper);

  return (
    <div
      ref={drop}
      style={{
        backgroundColor: isDraggingGroup && contrastColor,
        color: theme.palette.text.primary,
      }}
      className={
        "" +
        (emptySurvey
          ? styles.groupEmptyHint +
            (isOver ? " " + styles.groupEmptyHintHover : "")
          : isOver && canDrop
          ? styles.groupDropArea
          : isDraggingGroup
          ? styles.groupDragging
          : index === 0
          ? styles.groupHiddenFirst
          : styles.groupHidden)
      }
    >
      {isDraggingGroup && !emptySurvey && (
        <>
          <span className={styles.dropText}>{t("drop_page_here")}</span>
        </>
      )}
      {emptySurvey && <span>{t("drop_page_here")}</span>}
    </div>
  );
}

export function QuestionDropArea({
  index,
  isLast = false,
  parentCode,
  parentType,
  parentIndex,
  emptyGroup = false,
  isLastGroup = false,
  t,
}) {
  const theme = useTheme();
  const dispatch = useDispatch();

  const designMode = useSelector((state) => state.designState.designMode);

  // This is a "hack" to make these components refresh when questions are being reordered.
  // So the first and the last Drag elements can refresh and resize accordingly
  // otherwise, they don't refresh on hover
  const reorderRefreshCode = useSelector((state) => {
    return state.designState["reorder_refresh_code"];
  });

  const [{ isOver, isDragging }, drop] = useDrop(
    () => ({
      accept: ["new-questions", "questions"],
      hover(item) {
        if (item.type !== "questions" || item.droppableId === parentCode) {
          return;
        }
        if (parentType === "end" && !isDisplay(item.itemType)) {
          return;
        }
        dispatch(
          onDrag({
            type: "reparent_question",
            source: item.droppableId,
            destination: parentCode,
            id: item.draggableId,
          })
        );
        item.index = index;
        item.parentIndex = parentIndex;
        item.isLast = isLast;
        item.droppableId = parentCode;
      },
      drop: (item) => {
        if (item.type !== "new-questions") {
          return;
        }
        dispatch(
          onDrag({
            type: "new_question",
            questionType: item.draggableId,
            destination: parentCode,
            toIndex: index,
          })
        );
      },
      collect: (monitor) => {
        return {
          isOver:
            monitor.getItem()?.type == "new-questions" &&
            monitor.isOver() &&
            (parentType !== "end" || isDisplay(monitor.getItem()?.itemType)),
          isDragging:
            parentType === "end" && !isDisplay(monitor.getItem()?.itemType)
              ? false
              : monitor.getItem()?.droppableId === "new-questions" ||
                (monitor.getItem()?.type === "questions" &&
                  monitor.getItem().droppableId !== parentCode &&
                  ((index == 0 &&
                    monitor.getItem().isLast &&
                    monitor.getItem().parentIndex + 1 === parentIndex) ||
                    (isLast &&
                      monitor.getItem().index == 0 &&
                      monitor.getItem().parentIndex - 1 === parentIndex))),
        };
      },
    }),
    [reorderRefreshCode, index]
  );

  const { ref, inView, entry } = useInView({
    /* Optional options */
    threshold: 0,
    trackVisibility: isDragging,
    delay: isDragging ? 100 : 0,
  });

  const textContrast = theme.palette.text.primary;

  if (!inDesign(designMode)) {
    return null;
  }

  return (
    <div
      ref={ref}
      style={{
        padding: isDragging ? "1rem" : 0
      }}
    >
      {" "}
      <div
        ref={drop}
        style={{
          marginTop: !isDragging && !isOver ? "0rem" : "inherit",
          marginBottom:
            !isDragging && !isOver ? (emptyGroup ? "1rem" : "0rem") : "inherit",
        }}
        className={
          "question-drop-area" +
          " " +
          (emptyGroup
            ? isOver
              ? parentType === "end"
                ? styles.questionDropAreaEmptyEnd
                : styles.questionDropAreaEmptyGroup
              : isDragging && inView
              ? parentType === "end"
                ? styles.isDraggingEmptyEnd
                : styles.isDraggingEmptyGroup
              : parentType === "end"
              ? styles.endPageEmptyHint
              : styles.groupEmptyHint
            : isOver
            ? styles.questionDropArea
            : isDragging && inView
            ? styles.isDragging
            : styles.hidden) +
          " "
        }
      >
        {isDragging && inView && (
          <Box display="flex" justifyContent="center" alignItems="center">
            <HelpOutline sx={{ marginRight: "8px", color: textContrast }} />
            <span
              className={styles.dropText}
              style={{
                color: textContrast,
              }}
            >
              {t("drop_question_here")}
            </span>
          </Box>
        )}
        {emptyGroup && !(isDragging && inView) && parentType !== "end" && (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            gap="12px"
            className={styles.emptyGroupContent}
          >
            <img src={dragIcon} alt="" width={48} height={48} />
            <span
              className={styles.emptyGroupText}
            >
              {isLastGroup ? t("empty_group_hint_last") : t("empty_group_hint")}
            </span>
          </Box>
        )}
        {emptyGroup && !(isDragging && inView) && parentType === "end" && (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            gap="16px"
            sx={{ color: theme.textStyles.question.color }}
            className={styles.emptyGroupContent}
          >
            <span
              className={styles.endPageText}
            >
              <Trans t={t} i18nKey="end_page_empty_hint" />
            </span>
            <Box className={styles.endPageActions} >
              <div
                className={styles.endPageActionItem}
                onClick={() =>
                  dispatch(
                    onDrag({
                      type: "new_question",
                      questionType: "text_display",
                      destination: parentCode,
                      toIndex: 0,
                    })
                  )
                }
              >
                <div className={styles.endPageActionIcon}>
                  <img src={addTextIcon} alt="" width={24} height={24} />
                </div>
                <span>{t("add_a_text")}</span>
              </div>
              <div
                className={styles.endPageActionItem}
                onClick={() =>
                  dispatch(
                    onDrag({
                      type: "new_question",
                      questionType: "image_display",
                      destination: parentCode,
                      toIndex: 0,
                    })
                  )
                }
              >
                <div className={styles.endPageActionIcon}>
                  <img src={addImageIcon} alt="" width={24} height={24} />
                </div>
                <span>{t("add_a_image")}</span>
              </div>
              <div
                className={styles.endPageActionItem}
                onClick={() =>
                  dispatch(
                    onDrag({
                      type: "new_question",
                      questionType: "video_display",
                      destination: parentCode,
                      toIndex: 0,
                    })
                  )
                }
              >
                <div className={styles.endPageActionIcon}>
                  <img src={addVideoIcon} alt="" width={24} height={24} />
                </div>
                <span>{t("add_video")}</span>
              </div>
            </Box>
          </Box>
        )}
      </div>
    </div>
  );
}

const canSortGroup = (item, index) => {
  if (item?.index === index || index - 1 === item?.index) {
    if (item?.droppableId !== "new-groups") {
      return false;
    }
  }
  return true;
};

const canDropWelcomeGroup = (item, index) => {
  if (item?.draggableId !== "welcome") {
    return true;
  }
  return index === 0;
};

const canDropEndGroup = (item, index, groupsCount) => {
  if (item?.draggableId !== "end") {
    return true;
  }
  return index === groupsCount;
};
