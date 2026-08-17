import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { IconButton, Typography } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { onDrag } from "~/state/design/designState";
import styles from "./MoveGroup.module.css";

const typeOf = (g) => (g?.type || g?.groupType || "").toLowerCase();

export default function MoveGroup({ code, t }) {
  const dispatch = useDispatch();

  const selectMove = React.useMemo(
    () =>
      createSelector(
        [(state) => state.designState.Survey?.children],
        (children) => {
          const empty = { ok: false };
          if (!Array.isArray(children) || !code?.startsWith("G")) return empty;
          const index = children.findIndex((g) => g.code === code);
          if (index === -1 || typeOf(children[index]) !== "group") return empty;
          let prevIndex = -1;
          for (let i = index - 1; i >= 0; i--)
            if (typeOf(children[i]) === "group") {
              prevIndex = i;
              break;
            }
          let nextIndex = -1;
          for (let i = index + 1; i < children.length; i++)
            if (typeOf(children[i]) === "group") {
              nextIndex = i;
              break;
            }
          return { ok: true, index, prevIndex, nextIndex };
        }
      ),
    [code]
  );

  const { ok, index, prevIndex, nextIndex } = useSelector(selectMove);
  if (!ok) return null;

  const move = (toIndex) => (e) => {
    e?.stopPropagation();
    if (toIndex < 0) return;
    dispatch(
      onDrag({ type: "reorder_groups", id: code, fromIndex: index, toIndex })
    );
  };

  return (
    <div className={styles.moveRow}>
      <Typography fontWeight={700}>{t("move_page")}</Typography>
      <div className={styles.actions}>
        <CustomTooltip title={t("move_page_up")} showIcon={false}>
          <span>
            <IconButton
              size="small"
              disabled={prevIndex < 0}
              onClick={move(prevIndex)}
              aria-label={t("move_page_up")}
            >
              <KeyboardArrowUpIcon />
            </IconButton>
          </span>
        </CustomTooltip>
        <CustomTooltip title={t("move_page_down")} showIcon={false}>
          <span>
            <IconButton
              size="small"
              disabled={nextIndex < 0}
              onClick={move(nextIndex)}
              aria-label={t("move_page_down")}
            >
              <KeyboardArrowDownIcon />
            </IconButton>
          </span>
        </CustomTooltip>
      </div>
    </div>
  );
}
