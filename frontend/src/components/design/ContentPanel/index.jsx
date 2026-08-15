import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ContentPanel.module.css";
import { useTheme } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { Box, css, CircularProgress, IconButton, Tooltip, alpha } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SettingsIcon from "@mui/icons-material/Settings";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import GroupDesign from "~/components/Group/GroupDesign";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { GroupDropArea } from "~/components/design/DropArea/DropArea";
import { Virtuoso } from "react-virtuoso";
import useDragNearViewportEdge from "~/utils/useDragEdgeDetection";
import {
  resetSetup,
  changeResources,
  setup,
} from "~/state/design/designState";
import { DESIGN_SURVEY_MODE } from "~/routes";
import { buildResourceUrl } from "~/networking/common";
import { useLogoUpload } from "~/hooks/useLogoUpload";
import {
  logoSetup,
  LOGO_ALIGNMENT_DEFAULT,
  LOGO_SIZE_DEFAULT,
  LOGO_SIZE_DIMENSIONS,
  LOGO_SPACING_DEFAULT,
} from "~/constants/design";
import { qlarrCssVars } from "~/components/Questions/qlarrVars";

const ALIGNMENT_TO_FLEX = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

function ContentPanel({ designMode }, ref) {
  const { i18n } = useTranslation(NAMESPACES.DESIGN_CORE);
  const theme = useTheme();
  const lang = useSelector((state) => state.designState.langInfo?.lang);
  const [langReady, setLangReady] = useState(false);

  useEffect(() => {
    if (lang) {
      setLangReady(false);
      i18n.loadLanguages([lang]).then(() => setLangReady(true));
    }
  }, [lang, i18n]);

  const panelStyle = useMemo(
    () => ({
      backgroundColor: theme.palette.background.default,
      ...qlarrCssVars(theme),
      "--design-error-color": theme.palette.error.main,
      "--design-error-tint": alpha(theme.palette.error.main, 0.06),
      "--new-item-flash": alpha(theme.palette.primary.main, 0.18),
      "--new-item-flash-end": alpha(theme.palette.primary.main, 0.04),
      "--question-prefix-color":
        theme.contrast?.onPaper || theme.palette.text.primary,
      "--page-label-color": alpha(
        theme.contrast?.onDefault || theme.palette.text.primary,
        0.6
      ),
      "--error-display-border": theme.palette.error.main,
      "--error-display-tint": alpha(theme.palette.error.main, 0.1),
      "--error-display-badge-bg": alpha(
        theme.contrast?.onPaper || theme.palette.text.primary,
        0.08
      ),
    }),
    [theme]
  );

  const t = useMemo(
    () => i18n.getFixedT(lang, NAMESPACES.DESIGN_CORE),
    [lang, i18n, langReady]
  );

  const groups = useSelector((state) => {
    return state.designState["Survey"]?.children || [];
  });
  const logoImage = useSelector(
    (state) => state.designState["Survey"]?.resources?.logoImage
  );
  const logoAlignment = useSelector(
    (state) =>
      state.designState["Survey"]?.resources?.logoAlignment ||
      LOGO_ALIGNMENT_DEFAULT
  );
  const logoSize = useSelector(
    (state) =>
      state.designState["Survey"]?.resources?.logoSize || LOGO_SIZE_DEFAULT
  );
  const logoSpacing = useSelector((state) => {
    const val = state.designState["Survey"]?.resources?.logoSpacing;
    return typeof val === "number" ? val : LOGO_SPACING_DEFAULT;
  });

  const groupsEmpty = !groups.length;

  const welcomeGroupExists = useMemo(() => {
    let returnResult = false;
    groups?.forEach((group) => {
      if (
        group?.type === "welcome" ||
        group.groupType?.toLowerCase() === "welcome"
      ) {
        returnResult = true;
      }
    });
    return returnResult;
  }, [groups]);

  const items = useMemo(() => {
    const list = [];

    if (!welcomeGroupExists) {
      list.push({ name: ELEMENTS.DROP_AREA, index: 0 });
    }

    let pageNumber = 1;
    // Find the last regular group index (right before the end page)
    let lastRegularIndex = -1;
    for (let i = groups.length - 1; i >= 0; i--) {
      const gt = (groups[i].type || groups[i].groupType || "").toLowerCase();
      if (gt !== "welcome" && gt !== "end") {
        lastRegularIndex = i;
        break;
      }
    }

    for (let i = 0; i < groups.length; i++) {
      const groupType = (groups[i].type || groups[i].groupType || "").toLowerCase();
      let label = null;

      if (groupType === "welcome") {
        label = t("welcome_page_label");
      } else if (groupType === "end") {
        label = t("thank_you_page_label");
      } else {
        label = t("page_label", { number: pageNumber });
        pageNumber++;
      }

      const isLastGroup = i === lastRegularIndex;
      list.push({ name: ELEMENTS.GROUP, group: groups[i], index: i, label, isLastGroup });
      if (groupType !== "end") {
        list.push({ name: ELEMENTS.DROP_AREA, group: groups[i], index: i + 1 });
      }
    }
    list.push({ name: ELEMENTS.FOOTER });
    return list;
  }, [groups, t]);

  const virtuosoRef = useRef(null);
  const virtuosoWrapperRef = useRef(null);
  const { isNearBottom, isNearTop } =
    useDragNearViewportEdge(virtuosoWrapperRef);

  const lastAddedComponent = useSelector(
    (state) => state.designState.lastAddedComponent
  );
  const skipScroll = useSelector((state) => state.designState.skipScroll);
  const dispatch = useDispatch();
  const { isUploading, handleFileInput: handleLogoFileInput } = useLogoUpload();

  const handleLogoReset = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(
      changeResources({ code: "Survey", key: "logoImage", value: null })
    );
    dispatch(resetSetup());
  };

  const handleLogoCustomize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(setup(logoSetup));
  };

  const canEditLogo = designMode === DESIGN_SURVEY_MODE.DESIGN;

  const virtuosoContext = useMemo(
    () => ({
      logoImage,
      logoAlignment,
      logoSize,
      logoSpacing,
      canEditLogo,
      isUploading,
      handleLogoFileInput,
      handleLogoReset,
      handleLogoCustomize,
      t,
    }),
    [
      logoImage,
      logoAlignment,
      logoSize,
      logoSpacing,
      canEditLogo,
      isUploading,
      t,
    ]
  );

  const virtuosoComponents = useMemo(() => ({ Header: LogoHeader }), []);

  useEffect(() => {
    let animationFrameId;
    const performScroll = () => {
      if (virtuosoRef.current) {
        if (isNearBottom) {
          virtuosoRef.current.scrollBy({ top: 6, behavior: "auto" });
        } else if (isNearTop) {
          virtuosoRef.current.scrollBy({ top: -6, behavior: "auto" });
        }
        animationFrameId = requestAnimationFrame(performScroll);
      }
    };

    if (isNearTop || isNearBottom) {
      animationFrameId = requestAnimationFrame(performScroll);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isNearTop, isNearBottom]);

  useEffect(() => {
    if (lastAddedComponent && virtuosoRef.current && !skipScroll) {
      const performScroll = () => {
        if (lastAddedComponent.type === "group") {
          // Find the exact list position of the group (accounts for the
          // optional leading drop area when no welcome page exists).
          const itemIndex = items.findIndex(
            (it) =>
              it.name === ELEMENTS.GROUP &&
              it.index === lastAddedComponent.index
          );
          if (itemIndex !== -1) {
            virtuosoRef.current.scrollToIndex({
              index: itemIndex,
              behavior: "smooth",
              align: "start",
            });
          }
        } else if (lastAddedComponent.type === "question") {
          // Calculate the exact index for the newly added question
          const groupBaseIndex = lastAddedComponent.groupIndex * 2; // Groups and their drop areas
          virtuosoRef.current.scrollToIndex({
            index: groupBaseIndex + 2, // Drop area + question offset
            behavior: "smooth",
            align: "end",
          });
        }
      };

      const timeoutId = setTimeout(performScroll, 100); // Ensure DOM is updated before scrolling

      return () => clearTimeout(timeoutId);
    }
  }, [lastAddedComponent]);

  return (
    <Box
      data-tour="content-panel"
      ref={ref}
      className={`content-panel ${styles.contentPanel}`}
      onClick={(event) => {
        if (designMode == DESIGN_SURVEY_MODE.DESIGN) {
          dispatch(resetSetup());
        }
      }}
      css={css`
        font-size: ${theme.textStyles.text.size}px;
        color: ${theme.textStyles.text.color};
        font-family: ${theme.textStyles.text.font};
      `}
      style={panelStyle}
    >
      <Box ref={virtuosoWrapperRef} width="100%" height="100%">
        <Virtuoso
          ref={virtuosoRef}
          data={items}
          components={virtuosoComponents}
          context={virtuosoContext}
          className={styles.virtuosoStyle}
          itemContent={(index, item) => {
            switch (item.name) {
              case ELEMENTS.DROP_AREA:
                return (
                  <GroupDropArea
                    emptySurvey={groupsEmpty}
                    t={t}
                    index={item.index}
                    groupsCount={groups.length}
                  />
                );
              case ELEMENTS.GROUP:
                return (
                  <>
                    <div className={styles.groupLabel} dir="auto">{item.label}</div>
                    <GroupDesign
                      t={t}
                      key={item.group.code}
                      designMode={designMode}
                      code={item.group.code}
                      index={item.index}
                      lastAddedComponent={lastAddedComponent}
                      isLastGroup={item.isLastGroup}
                    />
                  </>
                );
              case ELEMENTS.FOOTER:
                return <div className={styles.footer} />;
            }
          }}
        />
      </Box>
    </Box>
  );
}

export default React.forwardRef(ContentPanel);

const ELEMENTS = {
  GROUP: "GROUP",
  DROP_AREA: "DROP_AREA",
  FOOTER: "FOOTER",
};

function LogoHeader({ context }) {
  const {
    logoImage,
    logoAlignment,
    logoSize,
    logoSpacing,
    canEditLogo,
    isUploading,
    handleLogoFileInput,
    handleLogoReset,
    handleLogoCustomize,
    t,
  } = context;
  const theme = useTheme();
  const textColor = theme.textStyles?.text?.color || "#16205b";
  const cardStyle = { backgroundColor: theme.palette.background.paper };
  const textStyle = { color: textColor };

  const logoHeaderStyle = {
    justifyContent: ALIGNMENT_TO_FLEX[logoAlignment] || "center",
    marginTop: `${logoSpacing / 2}px`,
    marginBottom: `${logoSpacing / 2}px`,
  };
  const logoSizePx =
    LOGO_SIZE_DIMENSIONS[logoSize] || LOGO_SIZE_DIMENSIONS.medium;
  const logoImgStyle = {
    height: `${logoSizePx}px`,
    width: "auto",
    maxWidth: "100%",
  };

  if (logoImage && !isUploading) {
    const frameClass = canEditLogo
      ? `${styles.logoFrame} ${styles.logoFrameInteractive}`
      : styles.logoFrame;
    const toolbarStyle = {
      backgroundColor: theme.palette.background.paper,
    };
    const toolbarButtonStyle = { color: textColor };
    return (
      <div className={styles.logoHeader} style={logoHeaderStyle}>
        <div
          className={frameClass}
          onClick={canEditLogo ? handleLogoCustomize : undefined}
          role={canEditLogo ? "button" : undefined}
          tabIndex={canEditLogo ? 0 : undefined}
          onKeyDown={
            canEditLogo
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLogoCustomize(e);
                  }
                }
              : undefined
          }
          aria-label={canEditLogo ? t("customize_logo") : undefined}
        >
          <img
            className={styles.surveyLogo}
            src={buildResourceUrl(logoImage)}
            alt=""
            style={logoImgStyle}
          />
          {canEditLogo && (
            <div className={styles.logoToolbar} style={toolbarStyle}>
              <Tooltip title={t("customize_logo")} placement="top" arrow>
                <IconButton
                  className={styles.logoToolbarButton}
                  onClick={handleLogoCustomize}
                  size="small"
                  aria-label={t("customize_logo")}
                  style={toolbarButtonStyle}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("remove_logo")} placement="top" arrow>
                <IconButton
                  className={styles.logoToolbarButton}
                  onClick={handleLogoReset}
                  size="small"
                  aria-label={t("remove_logo")}
                  style={toolbarButtonStyle}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    );
  }

  const placeholderInner = (
    <>
      <ImageOutlinedIcon sx={{ fontSize: 36, color: textColor }} />
      <span className={styles.logoPlaceholderText} style={textStyle}>
        {t("upload_logo")}
      </span>
      <span className={styles.logoPlaceholderHint} style={textStyle}>
        {t("upload_logo_hint")}
      </span>
      <span className={styles.logoPlaceholderNote} style={textStyle}>
        {t("upload_logo_note")}
      </span>
    </>
  );

  if (!canEditLogo) {
    return (
      <div
        className={`${styles.logoPlaceholder} ${styles.logoPlaceholderDisabled}`}
        style={cardStyle}
      >
        {placeholderInner}
      </div>
    );
  }
  return (
    <label className={styles.logoPlaceholder} style={cardStyle}>
      {isUploading ? (
        <div className={styles.logoUploading}>
          <CircularProgress size={36} sx={{ color: textColor }} />
          <span className={styles.logoPlaceholderText} style={textStyle}>
            {t("uploading_logo")}
          </span>
        </div>
      ) : (
        placeholderInner
      )}
      <input
        hidden
        accept="image/*"
        type="file"
        onChange={handleLogoFileInput}
      />
    </label>
  );
}
