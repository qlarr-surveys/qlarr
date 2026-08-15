import styles from "./ChoiceItemDesign.module.css";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CloseIcon from "@mui/icons-material/Close";
import BuildIcon from "@mui/icons-material/Build";
import { alpha, Box, Checkbox, Radio, TextField } from "@mui/material";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import {
  addNewAnswers,
  changeContent,
  onDrag,
  onNewLine,
  removeAnswer,
  setup,
} from "~/state/design/designState";
import { setupOptions } from "~/constants/design";
import { useDrag, useDrop } from "react-dnd";
import { useEffect, useRef } from "react";
import { contentEditable, DESIGN_SURVEY_MODE, inDesign } from "~/routes";
import { useTheme } from "@emotion/react";
import { sanitizePastedText } from "~/components/design/ContentEditor/sanitizePastedText";
import ContentEditor from "~/components/design/ContentEditor";
import InlineCodeEditor from "~/components/design/InlineCodeEditor";
import { useReleaseGuard } from "~/hooks/useReleaseGuard";

function ChoiceItemDesign(props) {
  const dispatch = useDispatch();
  const ref = useRef(null);
  const theme = useTheme();
  const { guard, modal } = useReleaseGuard();

  const inputRef = useRef();
  const inFocus = useSelector((state) => {
    return state.designState.focus == props.qualifiedCode;
  });

  const answer = useSelector((state) => {
    return state.designState[props.qualifiedCode];
  });

  const langInfo = props.langInfo;

  const onMainLang = langInfo.lang === langInfo.mainLang;
  const lang = langInfo.lang;

  const content = useSelector((state) => {
    return state.designState[props.qualifiedCode].content?.[lang]?.["label"];
  });

  const mainContent = useSelector((state) => {
    return state.designState[props.qualifiedCode].content?.[
      langInfo.mainLang
    ]?.["label"];
  });

  const isInSetupText = useSelector((state) => {
    return (
      answer.type === "other" &&
      state.designState.setup?.code == props.qualifiedCode + "Atext"
    );
  });
  const isInSetup = useSelector((state) => {
    return state.designState.setup?.code == props.qualifiedCode;
  });

  const getStyles = (isDragging) => {
    const styles = {
      transition: "all 500ms",
    };

    if (isDragging) {
      styles.opacity = 0.5;
    }

    return styles;
  };

  const [isDragging, drag, preview] = useDrag(
    {
      type: props.droppableId,
      item: {
        index: props.index,
        draggableId: props.qualifiedCode,
        type: props.droppableId,
        code: props.code,
        itemType: props.type,
        droppableId: props.droppableId,
      },
      collect: (monitor) => monitor.isDragging(),
    },
    [props]
  );

  const [{ handlerId }, drop] = useDrop({
    accept: props.droppableId,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!ref.current || !monitor.isOver({ shallow: true }) || !item) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = props.index;
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      dispatch(
        onDrag({
          type: "reorder_answers",
          id: item.draggableId,
          fromIndex: item.index,
          toIndex: props.index,
        })
      );

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  drop(preview(ref));

  useEffect(() => {
    if (inFocus) {
      // Use setTimeout to ensure the DOM is ready
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
    }
  }, [inFocus, inputRef.current]);

  const onInput = (e) => {
    if (!contentEditable(props.designMode)) {
      return;
    }
    const value = e.target.value;
    if (value.endsWith("\n")) {
      props.onNewLine();
    } else {
      const sanitizedText = sanitizePastedText(e.target.value);
      const text = sanitizedText[0];
      const rest = sanitizedText.slice(1);
      if (rest.length > 0) {
        props.onMoreLines(rest);
      }
      dispatch(
        changeContent({
          code: props.qualifiedCode,
          key: "label",
          lang: langInfo.lang,
          value: text,
        })
      );
    }
  };

  const contrastColor = alpha(theme.textStyles.question.color, 0.2);

  return (
    <div ref={ref} style={getStyles(isDragging)} data-handler-id={handlerId}>
      <Box
        data-code={props.code}
        sx={{ backgroundColor: isInSetup ? contrastColor : "inherit" }}
        className={styles.answerItem}
        style={{
          gap: "8px",
          marginTop: props.type === "text" ? "8px" : "inherit",
          marginBottom: props.type === "text" ? "8px" : "inherit",
        }}
      >
        {inDesign(props.designMode) && (
          <div ref={drag} className={styles.answerIcon}>
            <DragIndicatorIcon
              color="action"
              ref={drag}
              className={styles.smallIcon}
            />
          </div>
        )}
        {inDesign(props.designMode) && (
          <InlineCodeEditor
            qualifiedCode={props.qualifiedCode}
            designMode={props.designMode}
          />
        )}
        {props.type === "checkbox" ? (
          <Checkbox />
        ) : props.type === "radio" ? (
          <Radio />
        ) : null}{" "}
        {answer.type === "other" ? (
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            className={`${styles.textFieldOther} ${isInSetupText ? styles.textFieldOtherHighlight : ""}`}
            style={{ "--qlarr-contrast-color": contrastColor }}
            value={content || ""}
            onChange={(e) => {
              if (contentEditable(props.designMode)) {
                dispatch(
                  changeContent({
                    code: props.qualifiedCode,
                    key: "label",
                    lang: lang,
                    value: e.target.value,
                  })
                );
              }
            }}
            placeholder={
              onMainLang
                ? props.t("content_editor_placeholder_option")
                : mainContent || props.t("content_editor_placeholder_option")
            }
            InputProps={{
              endAdornment: inDesign(props.designMode) ? (
                <BuildIcon
                  key="setup"
                  color="action"
                  className={`${styles.smallIcon} ${styles.answerIconOther}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    dispatch(
                      setup({
                        code: props.qualifiedCode + "Atext",
                        rules: setupOptions("other_text"),
                      })
                    );
                  }}
                />
              ) : undefined,
            }}
          />
        ) : (
          <ContentEditor
            code={props.qualifiedCode}
            showToolbar={false}
            customStyle={props.type == "text" ? `flex: 1` : undefined}
            editable={
              props.designMode == DESIGN_SURVEY_MODE.DESIGN ||
              props.designMode == DESIGN_SURVEY_MODE.LANGUAGES
            }
            extended={false}
            onNewLine={props.onNewLine}
            onMoreLines={props.onMoreLines}
            placeholder={
              onMainLang
                ? props.t("content_editor_placeholder_option", {
                    lng: langInfo.mainLang,
                  })
                : mainContent || props.t("content_editor_placeholder_option")
            }
            contentKey="label"
          />
        )}
        {props.type === "text" && (
          <>
            <TextField
              className={styles.textFieldInert}
              size="small"
              value=""
              variant="outlined"
            />
          </>
        )}
        {inDesign(props.designMode) && (
          <>
            <span style={{ margin: "8px" }} />
            <BuildIcon
              key="setup"
              color="action"
              className={`${styles.smallIcon} ${styles.answerIconSettings}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                dispatch(
                  setup({
                    code: props.qualifiedCode,
                    rules: setupOptions(
                      props.type === "text" ? "text_item" : "options",
                    ),
                  })
                );
              }}
            />
          </>
        )}
        {inDesign(props.designMode) && (
          <CloseIcon
            key="close"
            color="action"
            className={`${styles.smallIcon} ${styles.answerIconSettings}`}
            onClick={(e) => {
              e.stopPropagation();
              guard(() => dispatch(removeAnswer(props.qualifiedCode)), {
                messageKey: "released_delete_option",
              });
            }}
          />
        )}
      </Box>
      {modal}
    </div>
  );
}

export default ChoiceItemDesign;
