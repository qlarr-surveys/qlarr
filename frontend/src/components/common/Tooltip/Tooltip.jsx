import { useEffect, useRef, useState } from "react";
import { Tooltip, Button } from "@mui/material";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import styles from "./Tooltip.module.css";

const CustomTooltip = ({
  title,
  body,
  url,
  children,
  showIcon = true,
  placement = "bottom-start",
  // Merged over the default tooltip styling. The status legend is a five-row
  // table that needs more width than a one-line tooltip.
  tooltipSx,
  // What the trigger announces. Callers that can say what the ⓘ is about
  // ("About the survey description") should; the generic label is the floor,
  // not the target.
  iconLabel,
}) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const triggerRef = useRef(null);
  const { t } = useTranslation();

  // Bound to no namespace, and resolved against both of the ones that hold the
  // key, because this renders under the manage routes and inside the design
  // editor, which load different bundles. Naming them in useTranslation would
  // suspend whichever route has not loaded the other.
  const triggerLabel =
    iconLabel ||
    t("tooltips.more_info", {
      ns: [NAMESPACES.MANAGE, NAMESPACES.DESIGN_CORE],
      defaultValue: "More information",
    });

  useEffect(() => {
    if (!tooltipOpen || !showIcon) return;

    const handleClickOutside = (event) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target)) {
        setTooltipOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [tooltipOpen]);

  const tooltipContent = (
    <div>
      {title && <span  dangerouslySetInnerHTML={{ __html: `<strong>${title}</strong>` }} />}
      {body && <p className={styles.textPreLine} dangerouslySetInnerHTML={{ __html: body }} />}
      {url && (
        <Button
          variant="text"
          href={url}
          target="_blank"
          sx={{ padding: 0, textTransform: "none" }}
        >
          Read more...
        </Button>
      )}
    </div>
  );

  const commonTooltipProps = {
    title: tooltipContent,
    placement,
    componentsProps: {
      tooltip: {
        sx: {
          backgroundColor: "#fff",
          color: "#1a2052",
          fontSize: "0.875rem",
          border: "1px solid #dadde9",
          padding: 1,
          ...tooltipSx,
        },
      },
    },
  };

  if (showIcon) {
    return (
      <div ref={triggerRef} className={styles.tooltipContainer}>
        <Tooltip {...commonTooltipProps} open={tooltipOpen}>
          {/* A real button, not an icon carrying onClick: the tooltip opens on
              click, so without one there is no keyboard path to the help at
              all. It also gives the 24px target the redesign draws. */}
          <button
            type="button"
            className={styles.iconButton}
            aria-label={triggerLabel}
            aria-expanded={tooltipOpen}
            onClick={(e) => {
              e.stopPropagation();
              setTooltipOpen((prev) => !prev);
            }}
          >
            <Info size={14} strokeWidth={1.4} />
          </button>
        </Tooltip>
      </div>
    );
  }

  return <Tooltip {...commonTooltipProps}>{children}</Tooltip>;
};

export default CustomTooltip;
