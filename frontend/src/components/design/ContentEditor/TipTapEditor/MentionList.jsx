import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import "./MentionList.css";

const MentionList = forwardRef(({ items, command }, ref) => {
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = useCallback(
    (index) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [items, command]
  );

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((selectedIndex + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }),
    [selectedIndex, items, selectItem]
  );


  return (
    <div className="mention-list">
      {items.length ? (
        items.map((item, index) => (
          <div
            className={`mention-item ${
              index === selectedIndex ? "is-selected" : ""
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              selectItem(index);
            }}
            key={index}
          >
            <span className="mention-label">{item.value || item.label}</span>
            <span className="mention-type">{item.type}</span>
          </div>
        ))
      ) : (
        <div className="mention-item">{t("mention_no_result")}</div>
      )}
    </div>
  );
});

MentionList.displayName = "MentionList";

export default MentionList;
