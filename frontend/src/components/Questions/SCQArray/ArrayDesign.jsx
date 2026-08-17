import styles from "./SCQArrayDesign.module.css";

import {
  Box,
  Button,
  Checkbox,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from "@mui/material";
import { useSelector } from "react-redux";
import React, { useRef, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  addNewAnswer,
  addNewAnswers,
  onDrag,
  onNewLine,
  removeAnswer,
} from "~/state/design/designState";
import { useDispatch } from "react-redux";
import { useDrag, useDrop } from "react-dnd";
import { rtlLanguage } from "~/utils/common";
import { contentEditable, inDesign } from "~/routes";
import { useReleaseGuard } from "~/hooks/useReleaseGuard";
import { useColumnMinWidth } from "~/utils/design/utils";
import ContentEditor from "~/components/design/ContentEditor";

function ArrayDesign(props) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const t = props.t;

  const { header, rowLabel } = useColumnMinWidth(props.code);
  const langInfo = props.langInfo;

  const children = useSelector(
    (state) => state.designState[props.code].children
  );
  const rows = React.useMemo(
    () => children?.filter((el) => el.type == "row") || [],
    [children]
  );

  const columns = React.useMemo(
    () => children?.filter((el) => el.type == "column") || [],
    [children]
  );

  return (
    <>
      {inDesign(props.designMode) && (
        <div className={styles.addColumn}>
          <Button
            size="small"
            onClick={(e) =>
              dispatch(
                addNewAnswer({ questionCode: props.code, type: "column" })
              )
            }
          >
            {t("add_column")}
          </Button>
        </div>
      )}

      <TableContainer className={styles.tableContainer}>
        <Table className={styles.table}>
          <TableHead>
            <TableRow>
              <TableCell
                className={styles.rowLabelHeader}
                style={{ '--qlarr-cell-width': rowLabel + 'px' }}
                key="move"
              ></TableCell>
              {columns.map((item, index) => {
                return (
                  <ArrayHeaderDesign
                    parentQualifiedCode={props.qualifiedCode}
                    langInfo={langInfo}
                    designMode={props.designMode}
                    width={header}
                    t={props.t}
                    key={item.qualifiedCode}
                    item={item}
                    index={index}
                  />
                );
              })}
              {inDesign(props.designMode) && (
                <TableCell
                  className={styles.removeColumnHeader}
                  key="remove"
                ></TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item, index) => {
              return (
                <ArrayRowDesign
                  parentQualifiedCode={props.code}
                  type={props.type}
                  langInfo={langInfo}
                  onMoreLines={(data) => {
                    dispatch(
                      addNewAnswers({
                        questionCode: props.code,
                        index,
                        data,
                        type: "row",
                      })
                    );
                  }}
                  onNewLine={() => {
                    dispatch(
                      onNewLine({
                        questionCode: props.code,
                        index,
                        type: "row",
                      })
                    );
                  }}
                  t={props.t}
                  designMode={props.designMode}
                  key={item.qualifiedCode}
                  item={item}
                  colCount={columns.length}
                  index={index}
                />
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {inDesign(props.designMode)  && (
        <div className={styles.addRow}>
          <Button
            size="small"
            onClick={(e) =>
              dispatch(addNewAnswer({ questionCode: props.code, type: "row" }))
            }
          >
            {t("add_row")}
          </Button>
        </div>
      )}
    </>
  );
}

export default React.memo(ArrayDesign);

function ArrayRowDesign({
  item,
  index,
  colCount,
  designMode,
  type,
  t,
  onNewLine,
  onMoreLines,
  langInfo,
  parentQualifiedCode,
}) {
  const dispatch = useDispatch();
  const { guard, modal } = useReleaseGuard();
  const ref = useRef();
  const inputRef = useRef();

  const onMainLang = langInfo.lang === langInfo.mainLang;

  const content = useSelector((state) => {
    return state.designState[item.qualifiedCode].content?.[langInfo.lang]?.[
      "label"
    ];
  });

  const inFocus = useSelector((state) => {
    return state.designState.focus == item.qualifiedCode;
  });

  const mainContent = useSelector((state) => {
    return state.designState[item.qualifiedCode].content?.[langInfo.mainLang]?.[
      "label"
    ];
  });
  const itemType = `col-${parentQualifiedCode}`;

  const [isDragging, drag, preview] = useDrag(
    {
      type: itemType,
      item: {
        qualifiedCode: item.qualifiedCode,
        index: index,
      },
      collect: (monitor) => monitor.isDragging(),
    },
    [index]
  );

  useEffect(() => {
    if (inFocus) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
    }
  }, [inFocus, inputRef.current]);

  const [{ handlerId }, drop] = useDrop({
    accept: itemType,
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
      if (dragIndex === hoverIndex) {
        return;
      }
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      dispatch(
        onDrag({
          type: "reorder_answers_by_type",
          id: item.qualifiedCode,
          fromIndex: item.index,
          toIndex: hoverIndex,
        })
      );
      item.index = hoverIndex;
    },
  });

  drop(preview(ref));
  return (
    <TableRow
      data-code={item.code}
      className={isDragging ? styles.dragging : ''}
      ref={ref}
      key={item.code}
      data-handler-id={handlerId}
    >
      <TableCell
        className={styles.rowLabelCell}
      >
        <Box display="flex" alignItems="center">
          {inDesign(designMode) && (
            <div ref={drag}>
              <DragIndicatorIcon color="action" />
            </div>
          )}
          <ContentEditor
            code={item.qualifiedCode}
            showToolbar={false}
            editable={contentEditable(designMode)}
            extended={false}
            onNewLine={onNewLine}
            onMoreLines={onMoreLines}
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
        </Box>
      </TableCell>

      {[...Array(colCount)].map((_option, index) => {
        return (
          <TableCell
            key={index}
            scope="row"
            align="center"
            className={styles.choiceCell}
          >
            {type === "scq_array" ? <Radio /> : <Checkbox />}
          </TableCell>
        );
      })}
      {inDesign(designMode) && (
        <TableCell
          onClick={(e) => {
            e.stopPropagation();
            guard(() => dispatch(removeAnswer(item.qualifiedCode)), {
              messageKey: "released_delete_option",
            });
          }}
          key="remove"
          className={styles.removeCellDesign}
        >
          <CloseIcon color="action" />
          {modal}
        </TableCell>
      )}
    </TableRow>
  );
}

function ArrayHeaderDesign({
  item,
  index,
  designMode,
  t,
  langInfo,
  parentQualifiedCode,
  width,
}) {
  const dispatch = useDispatch();
  const { guard, modal } = useReleaseGuard();
  const ref = useRef();

  const onMainLang = langInfo.lang === langInfo.mainLang;

  const isRtl = rtlLanguage.includes(langInfo.lang);
  const isLtr = !isRtl;

  const mainContent = useSelector((state) => {
    return state.designState[item.qualifiedCode].content?.[langInfo.mainLang]?.[
      "label"
    ];
  });
  const itemType = `row-${parentQualifiedCode}`;

  const [isDragging, drag, preview] = useDrag(
    {
      type: itemType,
      item: {
        qualifiedCode: item.qualifiedCode,
        index: index,
      },
      collect: (monitor) => monitor.isDragging(),
    },
    [index]
  );

  const [{ handlerId }, drop] = useDrop({
    accept: itemType,
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
      if (dragIndex === hoverIndex) {
        return;
      }
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleX =
        (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      if (isLtr && dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
        return;
      }
      if (isLtr && dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
        return;
      }
      if (isRtl && dragIndex < hoverIndex && hoverClientX > hoverMiddleX) {
        return;
      }
      if (isRtl && dragIndex > hoverIndex && hoverClientX < hoverMiddleX) {
        return;
      }

      dispatch(
        onDrag({
          type: "reorder_answers_by_type",
          id: item.qualifiedCode,
          fromIndex: item.index,
          toIndex: hoverIndex,
        })
      );
      item.index = hoverIndex;
    },
  });

  drop(preview(ref));
  return (
    <TableCell
      ref={ref}
      data-handler-id={handlerId}
      align="center"
      className={`${styles.headerCell} ${isDragging ? styles.dragging : ''}`}
      style={{ '--qlarr-cell-width': width + 'px' }}
      key={item.qualifiedCode}
    >
      {inDesign(designMode) && (
        <div className={styles.inlineFlex}>
          <div
            ref={drag}
            key="move"
          >
            <DragIndicatorIcon color="action" />
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              guard(() => dispatch(removeAnswer(item.qualifiedCode)), {
                messageKey: "released_delete_option",
              });
            }}
          >
            <CloseIcon color="action" />
          </div>
          {modal}
        </div>
      )}
      <div className="array-column-header">
        <ContentEditor
          code={item.qualifiedCode}
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
      </div>
    </TableCell>
  );
}
