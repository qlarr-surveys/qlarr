import { useEffect, useRef, useState } from "react";
import { Tooltip, Button } from "@mui/material";
import HelpOutline from "@mui/icons-material/HelpOutline";
import { useTheme } from "@emotion/react";
import styles from "./Tooltip.module.css";

const CustomTooltip = ({
  title,
  body,
  url,
  children,
  showIcon = true,
  placement = "bottom-start",
}) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const triggerRef = useRef(null);
  const theme = useTheme();

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
        },
      },
    },
  };

  if (showIcon) {
    return (
      <div ref={triggerRef} className={styles.tooltipContainer}>
        <Tooltip {...commonTooltipProps} open={tooltipOpen}>
          <HelpOutline
            className={styles.iconButton}
            sx={{
              fontSize: "16px",
              transition: "background-color 0.3s ease, color 0.3s ease",
              backgroundColor: tooltipOpen ? theme.palette.primary.main : "#fff",
              color: tooltipOpen ? "#fff" : "#1a2052",
              "&:hover": {
                backgroundColor: theme.palette.primary.main,
              },
            }}
            onClick={(e) => {
              e.stopPropagation();
              setTooltipOpen((prev) => !prev);
            }}
          />
        </Tooltip>
      </div>
    );
  }

  return <Tooltip {...commonTooltipProps}>{children}</Tooltip>;
};

export default CustomTooltip;
