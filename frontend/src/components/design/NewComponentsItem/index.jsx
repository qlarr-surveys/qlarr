import React from "react";
import styles from "./NewComponentsItem.module.css";
import { useDrag } from "react-dnd";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { rtlLanguage } from "~/utils/common";

/**
 * One row of the question-type list: a draggable name, and an ⓘ explaining what
 * the type is for.
 *
 * The name is a real `button`, not a `div` carrying onClick, because clicking
 * it appends a question — that was unreachable by keyboard. The ⓘ sits outside
 * it as a sibling, since a button cannot contain another button.
 */
function NewComponentsItem({ t, item, onClick }) {
  const { t: tTooltips, i18n } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);
  // The theme is pinned to `ltr` and only the emotion cache is flipped, so
  // MUI's Popper never mirrors a placement for us: an Arabic editor draws the
  // panel on the right with the ⓘ on its inner edge, and `bottom-end` would
  // hang the card over the canvas exactly as `right` did in English.
  const isRtl = rtlLanguage.includes(i18n.language);
  const [, drag] = useDrag({
    type: item.type,
    item: {
      draggableId: item.draggableId,
      droppableId: item.droppableId,
      itemType: item.itemType,
      type: item.type,
    },
  });

  const name = t("component_" + item.itemType + "_title");

  return (
    <div className={styles.row}>
      <button
        type="button"
        ref={drag}
        draggable
        className={styles.drag}
        onClick={onClick}
      >
        <span className={styles.chip} aria-hidden="true">
          {item.icon}
        </span>
        <span className={styles.label}>{name}</span>
      </button>
      {/* The redesign pins this card to the ⓘ's outer edge and drops it under
          the row (`left: r.right - 236`, `top: r.bottom + 6`, flipping above
          when the row is near the viewport floor), so all 236px of it stay
          inside the panel. A side placement hung it over the canvas instead. */}
      <CustomTooltip
        title={name}
        body={tTooltips(item.itemType)}
        iconLabel={t("about_type", { name })}
        placement={isRtl ? "bottom-start" : "bottom-end"}
        tooltipSx={{
          width: 236,
          maxWidth: 236,
          // The redesign's 6px gap in place of MUI's default 14px. Keyed on
          // the popper's resolved placement, as MUI's own rule is, so the
          // flipped card above a row near the floor is spaced the same.
          '.MuiTooltip-popper[data-popper-placement*="bottom"] &': {
            marginTop: "6px",
          },
          '.MuiTooltip-popper[data-popper-placement*="top"] &': {
            marginBottom: "6px",
          },
        }}
      />
    </div>
  );
}

export default NewComponentsItem;
