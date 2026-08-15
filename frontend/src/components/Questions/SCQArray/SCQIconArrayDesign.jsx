import styles from "./SCQArrayDesign.module.css";

import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  useTheme,
} from "@mui/material";
import { useSelector, shallowEqual } from "react-redux";
import React, { useEffect, useMemo, useRef, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  addNewAnswer,
  addNewAnswers,
  changeContent,
  changeResources,
  onDrag,
  onNewLine,
  removeAnswer,
} from "~/state/design/designState";
import { useDispatch } from "react-redux";
import { useDrag, useDrop } from "react-dnd";
import { rtlLanguage } from "~/utils/common";
import IconSelector from "~/components/design/IconSelector";
import DynamicSvg from "~/components/DynamicSvg";
import { buildResourceUrl } from "~/networking/common";
import { useService } from "~/hooks/use-service";
import { useReleaseGuard } from "~/hooks/useReleaseGuard";
import { contentEditable, DESIGN_SURVEY_MODE } from "~/routes";
import { useColumnMinWidth } from "~/utils/design/utils";
import { sanitizePastedText } from "~/components/design/ContentEditor/sanitizePastedText";
import ContentEditor from "~/components/design/ContentEditor";

function SCQIconArrayDesign(props) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const t = props.t;
  const width = useColumnMinWidth();

  const langInfo = useSelector((state) => {
    return state.designState.langInfo;
  });

  const inDesign = props.designMode == DESIGN_SURVEY_MODE.DESIGN;

  const children = useSelector((state) => {
    return state.designState[props.code].children;
  });

  const rows = children?.filter((el) => el.type == "row") || [];
  const columns = children?.filter((el) => el.type == "column") || [];

  const icons = useSelector((state) => {
    return columns.map((col) => state.designState[col.qualifiedCode]?.resources?.icon);
  }, shallowEqual);

  return (
    <>
      {inDesign && (
        <div className={styles.addColumn}>
          <Button
            size="small"
            onClick={(e) =>
              dispatch(addNewAnswer({ questionCode: props.code, type: "column" }))
            }
          >
            {t("add_column")}
          </Button>
        </div>
      )}

      <TableContainer className={styles.tableContainer}>
        <Table className={styles.tableMinWidth} style={{ '--qlarr-table-min-width': `${columns.length * 120}px` }}>
          <TableHead>
            <TableRow>
              <TableCell
                className={styles.emptyHeader}
                style={{ '--qlarr-cell-width': width }}
                key="move"
              ></TableCell>
              {columns.map((item, index) => {
                return (
                  <SCQArrayHeaderDesign
                    parentQualifiedCode={props.code}
                    langInfo={langInfo}
                    t={props.t}
                    designMode={props.designMode}
                    key={item.qualifiedCode}
                    item={item}
                    inDesign={inDesign}
                    icons={icons}
                    index={index}
                  />
                );
              })}
              {inDesign && (
                <TableCell
                  className={styles.removeCellDesign}
                  key="remove"
                ></TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item, index) => {
              return (
                <SCQArrayRowDesign
                  parentQualifiedCode={props.code}
                  langInfo={langInfo}
                  t={props.t}
                  key={item.qualifiedCode}
                  item={item}
                  designMode={props.designMode}
                  inDesign={inDesign}
                  width={width}
                  columns={columns}
                  icons={icons}
                  index={index}
                />
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {inDesign && (
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

export default React.memo(SCQIconArrayDesign);

function SCQArrayRowDesign({
  item,
  index,
  columns,
  icons,
  designMode,
  width,
  inDesign,
  t,
  langInfo,
  parentQualifiedCode,
}) {
  const dispatch = useDispatch();
  const { guard, modal } = useReleaseGuard();
  const theme = useTheme();
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

  useEffect(() => {
    if (inFocus) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
    }
  }, [inFocus, inputRef.current]);

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
        className={styles.rowCellWithWidth}
        style={{ '--qlarr-cell-width': width }}
      >
        <Box display="flex" alignItems="center">
          {inDesign && (
            <div ref={drag}>
              <DragIndicatorIcon color="action" />
            </div>
          )}
          <ContentEditor
            code={item.qualifiedCode}
            showToolbar={false}
            editable={contentEditable(designMode)}
            extended={false}
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
      {columns.map((option, index) => {
        return (
          <TableCell
            key={index}
            scope="row"
            align="center"
            className={styles.iconChoiceCell}
          >
            <DynamicSvg
              opacity={0.2}
              inDesign={true}
              theme={theme}
              onIconClick={() => {}}
              imageHeight="64px"
              svgUrl={icons[index] ? buildResourceUrl(icons[index]) : undefined}
            />
          </TableCell>
        );
      })}
      {inDesign && (
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

function SCQArrayHeaderDesign({
  item,
  index,
  designMode,
  icons,
  inDesign,
  t,
  langInfo,
  parentQualifiedCode,
}) {
  const designService = useService("design");
  const icon = icons[index];
  const [iconSelectoOpen, setIconSelectorOpen] = useState(false);
  const dispatch = useDispatch();
  const { guard, modal } = useReleaseGuard();
  const theme = useTheme();
  const ref = useRef();

  const onMainLang = langInfo.lang === langInfo.mainLang;

  const mainContent = useSelector((state) => {
    return state.designState[item.qualifiedCode].content?.[langInfo.mainLang]?.[
      "label"
    ];
  });

  const isRtl = rtlLanguage.includes(langInfo.lang);
  const isLtr = !isRtl;

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

  const uploadAsResource = (svgContent) => {
    const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });

    const svgFile = new File([svgBlob], "file.svg", { type: "image/svg+xml" });

    designService
      .uploadResource(svgFile)
      .then((response) => {
        dispatch(
          changeResources({
            code: item.qualifiedCode,
            key: "icon",
            value: response.name,
          })
        );
      })
      .catch((error) => {
        console.error(error.message);
      });
  };

  drop(preview(ref));
  return (
    <>
      <TableCell
        ref={ref}
        data-handler-id={handlerId}
        align="center"
        className={`${styles.headerCellIcon} ${isDragging ? styles.dragging : ''}`}
        key={item.qualifiedCode}
      >
        {inDesign && (
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

        <DynamicSvg
          onIconClick={() => setIconSelectorOpen(true)}
          theme={theme}
          inDesign={true}
          imageHeight="64px"
          svgUrl={icon ? buildResourceUrl(icon) : undefined}
        />
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
      </TableCell>
      {iconSelectoOpen && (
        <IconSelector
          currentIcon=""
          onIconSelected={(icon) => {
            if (icon) {
              uploadAsResource(icon);
            }
            setIconSelectorOpen(false);
          }}
        />
      )}
    </>
  );
}
