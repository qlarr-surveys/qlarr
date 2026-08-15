import React from "react";
import styles from "./GroupDesign.module.css";
import ContentEditor from "~/components/design/ContentEditor";
import { Box, css } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ErrorDisplay from "~/components/design/ErrorDisplay";
import { useSelector } from "react-redux";
import ActionToolbar from "../design/ActionToolbar";
import { DESIGN_SURVEY_MODE } from "~/routes";

function GroupHeader({ t, code, designMode, langInfo }) {
  console.debug("Group Header: " + code);

  const onMainLang = langInfo.onMainLang;

  const group = useSelector((state) => {
    return state.designState[code];
  });

  const theme = useTheme();

  const inDesgin = designMode == DESIGN_SURVEY_MODE.DESIGN;

  return (
    <Box className={styles.headerContent}>
      <Box className={styles.groupHeader}>
        <Box className={styles.contentContainer}>
          {inDesgin && onMainLang && (
            <div className={styles.actionToolbarVisible}>
              <ActionToolbar code={code} isGroup={true} />
            </div>
          )}
        </Box>
        <div
          css={css`
            font-size: ${theme.textStyles.group.size}px;
          `}
        >
          <ContentEditor
            editable={
              designMode == DESIGN_SURVEY_MODE.DESIGN ||
              designMode == DESIGN_SURVEY_MODE.LANGUAGES
            }
            code={code}
            extended={false}
            contentKey="label"
            placeholder={t("content_editor_placeholder_title", {
              lng: langInfo.mainLang,
            })}
          />
        </div>
        {group.showDescription && (
          <Box
            css={css`
              font-size: ${theme.textStyles.text.size}px;
            `}
            className={styles.textDescription}
          >
            <ContentEditor
              editable={
                designMode == DESIGN_SURVEY_MODE.DESIGN ||
                designMode == DESIGN_SURVEY_MODE.LANGUAGES
              }
              code={code}
              extended={true}
              contentKey="description"
              placeholder={t("content_editor_placeholder_description", {
                lng: langInfo.mainLang,
              })}
            />
          </Box>
        )}
        {onMainLang && <ErrorDisplay type="group" code={code} />}
      </Box>
    </Box>
  );
}

export default React.memo(GroupHeader);
