import { Box } from "@mui/system";
import React, { Fragment, useRef, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { shallowEqual, useSelector } from "react-redux";
import styles from "./Ranking.module.css";
import { useDrag, useDrop } from "react-dnd";
import { orderChange, valueChange } from "~/state/runState";
import Content from "~/components/run/Content";
import { useTheme } from "@emotion/react";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { Typography, IconButton, Button, useMediaQuery } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function Ranking(props) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { t } = useTranslation(NAMESPACES.RUN);
  const isMobile = useMediaQuery("(max-width: 600px)");
  const [flash, setFlash] = useState({ code: null, n: 0 });

  const visibleAnswers = useSelector(
    (state) =>
      props.component.answers.filter((ans) => {
        return state.runState.values[ans.qualifiedCode]?.relevance ?? true;
      }),
    shallowEqual
  );

  const state = useSelector((state) => {
    let valuesMap = {};
    visibleAnswers.forEach((element) => {
      valuesMap[element.qualifiedCode] =
        state.runState.values[element.qualifiedCode].value;
    });
    return valuesMap;
  }, shallowEqual);

  const itemTypeByCode = (code) => {
    return isNaN(state[code]) ? "unsorted" : "sorted";
  };

  const order = useSelector((state) => {
    let valuesMap = {};
    visibleAnswers.forEach((element) => {
      if (state.runState.order) {
        valuesMap[element.qualifiedCode] =
          state.runState.order[element.qualifiedCode];
      } else {
        valuesMap[element.qualifiedCode] =
          state.runState.values[element.qualifiedCode].order + 1;
      }
    });
    return valuesMap;
  }, shallowEqual);

  const withoutOrder = visibleAnswers
    .filter((option) => !state[option.qualifiedCode])
    .sort(function (a, b) {
      return order[a.qualifiedCode] - order[b.qualifiedCode];
    });

  const withOrder = visibleAnswers
    .filter((option) => +state[option.qualifiedCode] > 0)
    .sort(function (a, b) {
      return state[a.qualifiedCode] - state[b.qualifiedCode];
    });

  const onItemTransfer = (item, index, itemType) => {
    const unOrdered = { ...order };
    if (
      itemType == "sorted" &&
      itemTypeByCode(item.qualifiedCode) == "unsorted"
    ) {
      const currentOrder = index + 1;
      for (let key in state) {
        if (state.hasOwnProperty(key)) {
          if (state[key] >= currentOrder) {
            dispatch(
              valueChange({
                componentCode: key,
                value: state[key] + 1,
              })
            );
          }
        }
      }
      dispatch(
        valueChange({
          componentCode: item.qualifiedCode,
          value: currentOrder,
        })
      );
      item.index = index;

      const oldOrder = unOrdered[item.qualifiedCode];
      withoutOrder.forEach((item) => {
        if (unOrdered[item.qualifiedCode] >= oldOrder) {
          unOrdered[item.qualifiedCode] = unOrdered[item.qualifiedCode] - 1;
        }
      });

      dispatch(orderChange(unOrdered));
    } else if (
      itemType == "unsorted" &&
      itemTypeByCode(item.qualifiedCode) == "sorted"
    ) {
      const currentOrder = state[item.qualifiedCode];
      for (let key in state) {
        if (state.hasOwnProperty(key)) {
          if (state[key] >= currentOrder) {
            dispatch(
              valueChange({
                componentCode: key,
                value: state[key] - 1,
              })
            );
          }
        }
      }
      dispatch(
        valueChange({
          componentCode: item.qualifiedCode,
          value: undefined,
        })
      );
      item.index = index;

      const oldOrder = index + 1;

      withoutOrder.forEach((item) => {
        if (unOrdered[item.qualifiedCode] >= oldOrder) {
          unOrdered[item.qualifiedCode] = unOrdered[item.qualifiedCode] + 1;
        }
      });
      unOrdered[item.qualifiedCode] = oldOrder;
      dispatch(orderChange(unOrdered));
    }
  };

  const onClickMove = (option) => {
    const item = { qualifiedCode: option.qualifiedCode };
    if (itemTypeByCode(option.qualifiedCode) == "unsorted") {
      onItemTransfer(item, withOrder.length, "sorted");
    } else {
      onItemTransfer(item, withoutOrder.length, "unsorted");
    }
  };

  const onDoubleClick = (item) => {
    if (itemTypeByCode(item.qualifiedCode) == "unsorted") {
      onItemTransfer(item, withOrder.length, "sorted");
    } else {
      onItemTransfer(item, withoutOrder.length, "unsorted");
    }
  };

  const onHover = (
    hoveringItem,
    currentItem,
    currentItemType,
    currentItemIndex
  ) => {
    const unOrdered = { ...order };
    if (
      currentItemType == "unsorted" &&
      itemTypeByCode(hoveringItem.qualifiedCode) == "unsorted"
    ) {
      const hoveringOrder = unOrdered[hoveringItem.qualifiedCode];
      unOrdered[hoveringItem.qualifiedCode] =
        unOrdered[currentItem.qualifiedCode];
      unOrdered[currentItem.qualifiedCode] = hoveringOrder;
      dispatch(orderChange(unOrdered));
      hoveringItem.index = currentItemIndex;
    } else if (
      currentItemType == "sorted" &&
      itemTypeByCode(hoveringItem.qualifiedCode) == "sorted"
    ) {
      dispatch(
        valueChange({
          componentCode: hoveringItem.qualifiedCode,
          value: state[currentItem.qualifiedCode],
        })
      );
      dispatch(
        valueChange({
          componentCode: currentItem.qualifiedCode,
          value: state[hoveringItem.qualifiedCode],
        })
      );
      hoveringItem.index = currentItemIndex;
    }
  };

  const onMove = (option, direction) => {
    const currentRank = state[option.qualifiedCode];
    const targetRank = direction === "up" ? currentRank - 1 : currentRank + 1;
    if (targetRank < 1 || targetRank > withOrder.length) {
      return;
    }
    const neighbor = withOrder.find(
      (o) => state[o.qualifiedCode] === targetRank
    );
    if (!neighbor) {
      return;
    }
    dispatch(
      valueChange({ componentCode: option.qualifiedCode, value: targetRank })
    );
    dispatch(
      valueChange({ componentCode: neighbor.qualifiedCode, value: currentRank })
    );
    setFlash((f) => ({ code: option.qualifiedCode, n: f.n + 1 }));
  };

  const renderContainer = (itemType, options, merged) => (
    <RankingContainer
      theme={theme}
      onHover={onHover}
      onItemTransfer={onItemTransfer}
      onDoubleClick={onDoubleClick}
      onClickMove={onClickMove}
      onMove={onMove}
      ordererLength={withOrder.length}
      unordererLength={withoutOrder.length}
      order={order}
      itemType={itemType}
      options={options}
      state={state}
      merged={merged}
      flash={flash}
    />
  );

  const optionsHeader = (
    <div className={styles.columnHeader}>
      <Typography variant="subtitle2" className={styles.textSecondary}>
        {t("ranking_options")}
      </Typography>
      <Typography variant="caption" className={styles.textDisabled}>
        {t("ranking_remaining", { count: withoutOrder.length })}
      </Typography>
    </div>
  );

  const rankingHeader = (
    <div className={styles.columnHeader}>
      <Typography variant="subtitle2" className={styles.textSecondary}>
        {t("ranking_your_ranking")}
      </Typography>
      <Typography variant="caption" className={styles.textDisabled}>
        {t("ranking_ranked", { count: withOrder.length })}
      </Typography>
    </div>
  );

  if (isMobile) {
    return (
      <div className={styles.rankingBox}>
        <div className={styles.section}>
          {rankingHeader}
          {renderContainer("sorted", withOrder, true)}
        </div>
        <div className={`${styles.section} ${styles.sectionMuted}`}>
          {optionsHeader}
          {renderContainer("unsorted", withoutOrder, true)}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.rankingGrid}>
      <div className={styles.column}>
        {optionsHeader}
        {renderContainer("unsorted", withoutOrder, false)}
      </div>
      <div className={styles.column}>
        {rankingHeader}
        {renderContainer("sorted", withOrder, false)}
      </div>
    </div>
  );
}

function RankingContainer({
  itemType,
  theme,
  options,
  onItemTransfer,
  onDoubleClick,
  onClickMove,
  onMove,
  onHover,
  state,
  merged,
  flash,
}) {
  const { t } = useTranslation(NAMESPACES.RUN);
  const containerRef = useRef(null);
  const [{ isOver }, containerDrop] = useDrop({
    accept: "rankingOption",
    collect(monitor) {
      return { isOver: monitor.isOver({ shallow: false }) };
    },
  });
  if (!merged) {
    containerDrop(containerRef);
  }

  const isSorted = itemType === "sorted";

  return (
    <Box
      ref={containerRef}
      className={
        merged
          ? `${styles.mergedContainer} ${isOver ? styles.mergedContainerOver : ""}`
          : `${styles.dragContainer} ${
              isOver ? styles.dragContainerOver : styles.dragContainerDefault
            }`
      }
    >
      {options.length === 0 && (
        <DropArea
          itemType={itemType}
          index={0}
          fillParent={true}
          mobile={merged}
          onItemTransfer={onItemTransfer}
        >
          <Box className={merged ? styles.emptyStateMerged : styles.emptyState}>
            <Typography variant="body2" className={styles.textSecondary}>
              {isSorted ? t("ranking_drag_hint") : t("ranking_all_ranked")}
            </Typography>
          </Box>
        </DropArea>
      )}
      {options.map((option, index) => {
        return (
          <Fragment key={option.code}>
            <DropArea
              itemType={itemType}
              index={index}
              key={"drop" + option.code}
              mobile={merged}
              onItemTransfer={onItemTransfer}
            />
            <RankingOption
              theme={theme}
              index={index}
              key={option.code}
              onHover={onHover}
              itemType={itemType}
              option={option}
              onDoubleClick={onDoubleClick}
              onClickMove={onClickMove}
              onMove={onMove}
              count={options.length}
              mobile={merged}
              muted={merged && !isSorted}
              flash={flash}
              rank={isSorted ? state[option.qualifiedCode] : null}
            />
          </Fragment>
        );
      })}
      {options.length > 0 && (
        <DropArea
          itemType={itemType}
          index={options.length}
          key="last"
          fillParent={true}
          mobile={merged}
          onItemTransfer={onItemTransfer}
        />
      )}
    </Box>
  );
}

function RankingOption({
  theme,
  option,
  onDoubleClick,
  onClickMove,
  onMove,
  count,
  index,
  onHover,
  itemType,
  rank,
  mobile,
  muted,
  flash,
}) {
  const { t } = useTranslation(NAMESPACES.RUN);
  const containerRef = useRef();
  const item = {
    index: index,
    qualifiedCode: option.qualifiedCode,
  };
  const [isDragging, drag, preview] = useDrag({
    type: "rankingOption",
    item,
    collect: (monitor) =>
      monitor.getItem()?.qualifiedCode === option.qualifiedCode,
  });

  const [{ handlerId }, drop] = useDrop({
    accept: "rankingOption",
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (
        !containerRef.current ||
        !monitor.isOver({ shallow: true }) ||
        !item
      ) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = containerRef.current?.getBoundingClientRect();
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
      onHover(item, option, itemType, index);
    },
  });
  // On mobile the explicit buttons handle everything; wiring drag/drop there
  // lets the touch backend turn scroll gestures into accidental re-ranking.
  if (!mobile) {
    drop(preview(containerRef));
  }

  useEffect(() => {
    if (!flash || flash.code !== option.qualifiedCode) return;
    const el = containerRef.current;
    if (!el) return;
    el.classList.remove(styles.flash);
    // force reflow so the highlight animation restarts on every move
    void el.offsetWidth;
    el.classList.add(styles.flash);
  }, [flash?.n]);

  const isSorted = itemType === "sorted";

  return (
    <div ref={mobile ? undefined : drag}>
      <Box
        data-code={option.code}
        ref={containerRef}
        data-handler-id={handlerId}
        className={`${
          isDragging ? styles.rankingItemDragging : styles.rankingItem
        } ${muted ? styles.rankingItemMuted : ""} ${
          mobile ? styles.itemMobile : ""
        }`}
        onDoubleClick={mobile ? undefined : () => onDoubleClick(item)}
      >
        <div className={styles.itemMain}>
          {isSorted && rank != null && (
            <Box className={styles.rankBadge}>{rank}</Box>
          )}
          {!mobile && <DragIndicatorIcon className={styles.dragHandle} />}
          <div className={styles.itemContent}>
            <Content
              elementCode={option.code}
              customStyle={`font-size: ${theme.textStyles.text.size}px;`}
              name="label"
              content={option.content?.label}
            />
          </div>
          {!mobile ? (
            <IconButton
              size="small"
              aria-label={isSorted ? t("ranking_unrank") : t("ranking_rank")}
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                onClickMove(option);
              }}
            >
              {isSorted ? (
                <CloseIcon fontSize="small" />
              ) : (
                <ChevronRightIcon fontSize="small" />
              )}
            </IconButton>
          ) : !isSorted ? (
            <Button
              size="small"
              variant="outlined"
              className={styles.rankButton}
              onClick={(e) => {
                e.stopPropagation();
                onClickMove(option);
              }}
            >
              {t("ranking_rank")}
            </Button>
          ) : null}
        </div>
        {mobile && isSorted && (
          <div className={styles.rankControls}>
            <div className={styles.moveButtons}>
              <IconButton
                size="small"
                color="primary"
                disabled={rank <= 1}
                aria-label={t("ranking_move_up")}
                className={styles.moveButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(option, "up");
                }}
              >
                <KeyboardArrowUpIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="primary"
                disabled={rank >= count}
                aria-label={t("ranking_move_down")}
                className={styles.moveButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(option, "down");
                }}
              >
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            </div>
            <Button
              size="small"
              variant="text"
              color="error"
              className={styles.unrankControl}
              onClick={(e) => {
                e.stopPropagation();
                onClickMove(option);
              }}
            >
              {t("ranking_unrank")}
            </Button>
          </div>
        )}
      </Box>
    </div>
  );
}

function DropArea({ index, onItemTransfer, itemType, fillParent, mobile, children }) {
  const containerRef = useRef();
  const [{ handlerId }, drop] = useDrop({
    accept: "rankingOption",
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (
        !containerRef.current ||
        !monitor.isOver({ shallow: true }) ||
        !item
      ) {
        return;
      }
      onItemTransfer(item, index, itemType);
    },
  });
  if (!mobile) {
    drop(containerRef);
  }
  return (
    <div
      className={fillParent ? styles.dropAreaFill : styles.dropArea}
      ref={containerRef}
      data-handler-id={handlerId}
    >
      {children}
    </div>
  );
}

export default Ranking;
