import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { ChevronDown, ChevronUp } from "lucide-react";
import { onDrag } from "~/state/design/designState";
import { groupTypeOf } from "~/utils/design/utils";
import {
  SetupIconButton,
  SetupLabel,
  setupFieldStyles,
} from "~/components/design/setup/SetupFields";

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
          if (index === -1 || groupTypeOf(children[index]) !== "group") return empty;
          let prevIndex = -1;
          for (let i = index - 1; i >= 0; i--)
            if (groupTypeOf(children[i]) === "group") {
              prevIndex = i;
              break;
            }
          let nextIndex = -1;
          for (let i = index + 1; i < children.length; i++)
            if (groupTypeOf(children[i]) === "group") {
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
    <SetupLabel label={t("move_page")}>
      <span className={setupFieldStyles.actions}>
        <SetupIconButton
          label={t("move_page_up")}
          icon={ChevronUp}
          disabled={prevIndex < 0}
          onClick={move(prevIndex)}
        />
        <SetupIconButton
          label={t("move_page_down")}
          icon={ChevronDown}
          disabled={nextIndex < 0}
          onClick={move(nextIndex)}
        />
      </span>
    </SetupLabel>
  );
}
