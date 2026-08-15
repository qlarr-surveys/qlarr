import styles from "./ImageChoiceItemDesign.module.css";
import btnStyles from "~/components/Questions/shared/choiceItemButtons.module.css";
import { alpha, Box, css, Grid, IconButton, TextField } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import PhotoCamera from "@mui/icons-material/Photo";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  changeContent,
  changeResources,
  onDrag,
  removeAnswer,
  setup,
} from "~/state/design/designState";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { buildResourceUrl } from "~/networking/common";
import AddIcon from "@mui/icons-material/Add";
import { useRef, useState } from "react";
import { rtlLanguage } from "~/utils/common";
import { useDrag, useDrop } from "react-dnd";
import LoadingDots from "~/components/common/LoadingDots";
import { useService } from "~/hooks/use-service";
import { contentEditable, inDesign } from "~/routes";
import { Build } from "@mui/icons-material";
import { setupOptions } from "~/constants/design";
import ContentEditor from "~/components/design/ContentEditor";
import InlineCodeEditor from "~/components/design/InlineCodeEditor";
import { useReleaseGuard } from "~/hooks/useReleaseGuard";

function ImageChoiceItemDesign({
  parentCode,
  index,
  qualifiedCode,
  type,
  code,
  columnNumber,
  imageAspectRatio,
  designMode,
  langInfo,
  hideText,
  t,
  addAnswer,
}) {
  const designService = useService("design");
  const dispatch = useDispatch();
  const theme = useTheme();
  const ref = useRef();
  const fileInputRef = useRef();
  const [isUploading, setUploading] = useState(false);
  const { guard, modal } = useReleaseGuard();

  const answer = useSelector((state) => {
    return type == "add" ? undefined : state.designState[qualifiedCode];
  });
  const onMainLang = langInfo.lang === langInfo.mainLang;
  const lang = langInfo.lang;
  const isRtl = rtlLanguage.includes(lang);

  const content = useSelector((state) => {
    return type == "add"
      ? undefined
      : state.designState[qualifiedCode].content?.[lang]?.["label"];
  });

  const mainContent = useSelector((state) => {
    return type == "add"
      ? undefined
      : state.designState[qualifiedCode].content?.[langInfo.mainLang]?.[
          "label"
        ];
  });

  const onDelete = () => {
    dispatch(removeAnswer(qualifiedCode));
  };

  const isInSetup = useSelector((state) => {
    return state.designState.setup?.code == qualifiedCode;
  });

  const contrastColor = alpha(theme.textStyles.question.color, 0.2);

  const backgroundImage = answer?.resources?.image
    ? `url('${buildResourceUrl(answer.resources.image)}')`
    : `url('/placeholder-image.jpg')`;

  function handleImageChange(e) {
    e.preventDefault();
    let file = e.target.files[0];
    setUploading(true);
    designService
      .uploadResource(file)
      .then((response) => {
        setUploading(false);
        dispatch(
          changeResources({
            code: qualifiedCode,
            key: "image",
            value: response.name,
          })
        );
      })
      .catch((err) => {
        setUploading(false);
        console.error(err);
      });
  }

  const dragType = parentCode + "image-drag";
  const getRowByIndex = (index) => {
    return Math.round(index / columnNumber);
  };
  const getColByIndex = (index) => {
    return index % columnNumber;
  };
  const colIndex = getColByIndex(index);
  const rowIndex = getRowByIndex(index);

  const [isDragging, drag, preview] = useDrag(
    {
      type: dragType,
      item: {
        index: index,
        colIndex,
        rowIndex,
        draggableId: qualifiedCode,
        parentCode: parentCode,
        type: dragType,
        itemType: dragType,
      },
      collect: (monitor) => monitor.isDragging(),
    },
    [index]
  );

  const [{ handlerId }, drop] = useDrop({
    accept: dragType,
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
      const hoverIndex = index;

      const dragRowIndex = item.rowIndex;
      const hoverRowIndex = rowIndex;

      const dragColIndex = item.colIndex;
      const hoverColIndex = colIndex;
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const hoverMiddleX =
        (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      if (
        dragRowIndex < hoverRowIndex &&
        hoverClientY < hoverMiddleY &&
        dragColIndex < hoverColIndex &&
        hoverClientX < hoverMiddleX
      ) {
        return;
      }
      // Dragging upwards
      if (
        dragRowIndex > hoverRowIndex &&
        hoverClientY > hoverMiddleY &&
        dragColIndex > hoverColIndex &&
        hoverClientX > hoverMiddleX
      ) {
        return;
      }
      {
        dispatch(
          onDrag({
            type: "reorder_answers",
            id: item.draggableId,
            fromIndex: dragIndex,
            toIndex: hoverIndex,
          })
        );

        // Note: we're mutating the monitor item here!
        // Generally it's better to avoid mutations,
        // but it's good here for the sake of performance
        // to avoid expensive index searches.
        item.index = hoverIndex;
        item.rowIndex = hoverRowIndex;
        item.colIndex = hoverColIndex;
      }
    },
  });

  drop(preview(ref));

  return type == "add" ? (
    <Grid item xs={12 / columnNumber} key="add">
      <Box
        className={`${styles.addAnswerButton} ${styles.addButtonBox}`}
        onClick={() => {
          addAnswer();
        }}
        style={{
          "--qlarr-aspect-padding": 100 / imageAspectRatio + "%",
        }}
      >
        <div className={styles.addButtonOverlay}>
          <AddIcon className={styles.addAnswerIcon} color="action" />
        </div>
      </Box>
    </Grid>
  ) : (
    <>
      <Grid
        className={isDragging ? styles.dragging : ""}
        item
        data-code={code}
        position="relative"
        xs={12 / columnNumber}
        key={qualifiedCode}
      >
        {isInSetup && (
          <div
            className={styles.overlay}
            style={{ backgroundColor: contrastColor }}
          />
        )}
        <div
          className={`${styles.imageContainer} ${styles.imageContainerDynamic} ${
            inDesign(designMode) ? styles.clickableImage : ""
          }`}
          style={{
            "--qlarr-aspect-padding": 100 / imageAspectRatio + "%",
            "--qlarr-bg-image": backgroundImage,
          }}
          ref={ref}
          data-handler-id={handlerId}
          title={inDesign(designMode) ? t("replace_image") : undefined}
          onClick={
            inDesign(designMode)
              ? (e) => {
                  // Only trigger when the image area itself is clicked,
                  // not the overlaid buttons / drag handle.
                  if (e.target === e.currentTarget) {
                    fileInputRef.current?.click();
                  }
                }
              : undefined
          }
        >
          {inDesign(designMode) && (
            <div className={`${btnStyles.buttonContainers} ${styles.buttonContainersAbsolute}`}>
              <div className={btnStyles.leftZone}>
                <IconButton ref={drag} className={btnStyles.iconButton}>
                  <DragIndicatorIcon color="action" />
                </IconButton>
                <div className={btnStyles.codeWrapper}>
                  <InlineCodeEditor
                    qualifiedCode={qualifiedCode}
                    designMode={designMode}
                    compact
                  />
                </div>
              </div>
              <div className={btnStyles.rightZone}>
                <IconButton
                  className={btnStyles.iconButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    guard(onDelete, {
                      messageKey: "released_delete_option",
                      confirmWhenUnreleased: true,
                      unreleasedTitleKey: "delete",
                      unreleasedMessageKey: "delete_option",
                      confirmLabelKey: "delete",
                    });
                  }}
                >
                  <DeleteOutlineIcon />
                </IconButton>
                <IconButton
                  className={btnStyles.iconButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(
                      setup({
                        code: qualifiedCode,
                        rules: setupOptions("options"),
                      })
                    );
                  }}
                >
                  <Build />
                </IconButton>
                <IconButton
                  component="label"
                  className={btnStyles.iconButton}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <PhotoCamera />
                  <input
                    ref={fileInputRef}
                    hidden
                    id={`file-input-${qualifiedCode}`}
                    accept="image/*"
                    type="file"
                    onChange={handleImageChange}
                  />
                </IconButton>
              </div>
            </div>
          )}

          {isUploading && (
            <div className={styles.loadingContainer}>
              <LoadingDots />
            </div>
          )}
        </div>
        {!hideText && (
          <ContentEditor
            code={qualifiedCode}
            showToolbar={false}
            editable={contentEditable(designMode)}
            extended={false}
            centerText
            placeholder={
              onMainLang
                ? t("content_editor_placeholder_option", {
                    lng: langInfo.mainLang,
                  })
                : mainContent ||
                  t("content_editor_placeholder_option", {
                    lng: langInfo.mainLang,
                  })
            }
            contentKey="label"
          />
        )}
      </Grid>
      {modal}
    </>
  );
}

export default ImageChoiceItemDesign;
