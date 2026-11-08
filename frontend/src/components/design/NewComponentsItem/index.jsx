import React from "react";
import styles from "./NewComponentsItem.module.css";
import { useDrag } from "react-dnd";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

/**
 * One row of the question-type list: a draggable name, and an ⓘ explaining what
 * the type is for.
 *
 * The name is a real `button`, not a `div` carrying onClick, because clicking
 * it appends a question — that was unreachable by keyboard. The ⓘ sits outside
 * it as a sibling, since a button cannot contain another button.
 */
function NewComponentsItem({ t, item, onClick }) {
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);
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
      <CustomTooltip
        title={name}
        body={tTooltips(item.itemType)}
        iconLabel={t("about_type", { name })}
        placement="right"
      />
    </div>
  );
}

export default NewComponentsItem;
