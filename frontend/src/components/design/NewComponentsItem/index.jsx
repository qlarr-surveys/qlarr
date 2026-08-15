import React from "react";
import styles from "./NewComponentsItem.module.css";
import { useDrag } from "react-dnd";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function NewComponentsItem({ t, item, onClick }) {
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);
  const [isDragging, drag] = useDrag({
    type: item.type,
    item: {
      draggableId: item.draggableId,
      droppableId: item.droppableId,
      itemType: item.itemType,
      type: item.type,
    },
    collect: (monitor) => {
      return monitor.isDragging();
    },
  });

  return (
    <div
      ref={drag}
      className={
        styles.leftPannelItem +
        (item?.dragLayer ? " " + styles.isDrayLayer : "")
      }
      onClick={onClick}
    >
      <CustomTooltip  title={tTooltips(item.itemType)} />
      {item.icon}
      {t("component_" + item.itemType + "_title")}
    </div>
  );
}

export default NewComponentsItem;
