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
      {title && (
        <strong
          className={styles.tooltipTitle}
          dangerouslySetInnerHTML={{ __html: title }}
        />
      )}
      {/* A string is markup, as every caller but the status legend passes;
          a node is rendered as itself, because a legend of coloured pills is
          not something to spell out as an HTML string. */}
      {body &&
        (typeof body === "string" ? (
          <p
            className={styles.textPreLine}
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <div className={styles.tooltipBody}>{body}</div>
        ))}
      {url && (
        <Button
          variant="text"
          href={url}
          target="_blank"
          // The link sits on the dark card now, where the theme's primary blue
          // is all but invisible.
          sx={{ padding: 0, textTransform: "none", color: "#c7cbf0" }}
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
        // The redesign's tooltip is a dark card, not a bordered white one:
        // these float over cards that are themselves white, where a white
        // tooltip with a hairline border reads as part of the page.
        sx: {
          maxWidth: 280,
          padding: "9px 11px",
          borderRadius: "8px",
          backgroundColor: "#1b2150",
          color: "#fff",
          fontSize: "12.5px",
          lineHeight: "18px",
          boxShadow: "0 8px 22px rgba(20, 24, 52, 0.22)",
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
