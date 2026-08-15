import React from "react";
import {
  Box,
  Button,
  IconButton,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import ImageIcon from "@mui/icons-material/Image";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useDispatch, useSelector } from "react-redux";
import { changeResources, resetSetup } from "~/state/design/designState";
import { useLogoUpload } from "~/hooks/useLogoUpload";
import {
  LOGO_ALIGNMENT_DEFAULT,
  LOGO_SIZE_DEFAULT,
  LOGO_SPACING_DEFAULT,
} from "~/constants/design";
import styles from "./LogoSetup.module.css";

function LogoSetup({ t }) {
  const dispatch = useDispatch();
  const { isUploading, handleFileInput } = useLogoUpload();

  const alignment = useSelector(
    (state) =>
      state.designState.Survey?.resources?.logoAlignment ||
      LOGO_ALIGNMENT_DEFAULT
  );
  const size = useSelector(
    (state) =>
      state.designState.Survey?.resources?.logoSize || LOGO_SIZE_DEFAULT
  );
  const spacing = useSelector((state) => {
    const val = state.designState.Survey?.resources?.logoSpacing;
    return typeof val === "number" ? val : LOGO_SPACING_DEFAULT;
  });

  const setResource = (key, value) => {
    dispatch(changeResources({ code: "Survey", key, value }));
  };

  const handleAlignment = (_, value) => {
    if (value !== null) setResource("logoAlignment", value);
  };

  const handleSize = (_, value) => {
    if (value !== null) setResource("logoSize", value);
  };

  const handleSpacing = (_, value) => {
    setResource("logoSpacing", value);
  };

  const handleRemove = () => {
    setResource("logoImage", null);
    dispatch(resetSetup());
  };

  return (
    <div className={styles.logoSetup}>
      <div className={styles.section}>
        <div className={styles.titleRow}>
          <Typography variant="h6" component="h2">
            {t("logo_settings")}
          </Typography>
          <IconButton onClick={() => dispatch(resetSetup())} size="small">
            <CloseIcon />
          </IconButton>
        </div>
      </div>

      <hr className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.row}>
          <Typography variant="subtitle2">{t("logo_alignment")}</Typography>
          <ToggleButtonGroup
            className={styles.toggleGroup}
            value={alignment}
            exclusive
            onChange={handleAlignment}
            size="small"
          >
            <ToggleButton value="left" aria-label={t("align_left")}>
              <FormatAlignLeftIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="center" aria-label={t("align_center")}>
              <FormatAlignCenterIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="right" aria-label={t("align_right")}>
              <FormatAlignRightIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        <div className={styles.row}>
          <Typography variant="subtitle2">{t("logo_size")}</Typography>
          <ToggleButtonGroup
            className={styles.toggleGroup}
            value={size}
            exclusive
            onChange={handleSize}
            size="small"
          >
            <ToggleButton value="small">{t("logo_size_small")}</ToggleButton>
            <ToggleButton value="medium">{t("logo_size_medium")}</ToggleButton>
            <ToggleButton value="large">{t("logo_size_large")}</ToggleButton>
          </ToggleButtonGroup>
        </div>

        <div className={styles.row}>
          <div className={styles.rowInline}>
            <Typography variant="subtitle2">{t("logo_spacing")}</Typography>
            <span className={styles.spacingValue}>{spacing}px</span>
          </div>
          <Box px={1}>
            <Slider
              value={spacing}
              onChange={handleSpacing}
              min={0}
              max={64}
              step={4}
              size="small"
              valueLabelDisplay="auto"
            />
          </Box>
        </div>
      </div>

      <hr className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.actionRow}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<ImageIcon />}
            className={styles.actionButton}
            disabled={isUploading}
          >
            {isUploading ? t("uploading_logo") : t("replace_logo")}
            <input
              hidden
              accept="image/*"
              type="file"
              onChange={handleFileInput}
            />
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            className={styles.actionButton}
            onClick={handleRemove}
          >
            {t("remove_logo")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LogoSetup;
