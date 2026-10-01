import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Chip, Tooltip, css } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ContentEditor from "~/components/design/ContentEditor";
import {
  QUOTA_PARAM,
  quotaMessageKey,
} from "@qlarr/design-core/constants/design";
import { DESIGN_SURVEY_MODE } from "@qlarr/design-core/constants/designMode";
import { routes } from "~/routes";
import { showQuotaMessage } from "~/state/design/designState";
import { isNotEmptyHtml } from "~/utils/design/utils";
import styles from "./GroupDesign.module.css";

export function useSelectedQuotaMessage() {
  return useSelector((state) => {
    const code = state.designState.quotaMessageView?.code;
    const exists = state.designState.Survey?.quotas?.some(
      (quota) => quota.code === code,
    );
    return exists ? code : null;
  });
}

export const QuotaMessageSwitcher = React.memo(function QuotaMessageSwitcher({
  t,
  designMode,
  selected,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { surveyId } = useParams();

  const quotas = useSelector((state) => state.designState.Survey?.quotas);
  const content = useSelector((state) => {
    const lang = state.designState.langInfo?.lang;
    return state.designState.Survey?.content?.[lang];
  });

  if (!quotas?.length) {
    return null;
  }

  const select = (code) => dispatch(showQuotaMessage({ code }));

  return (
    <Box
      className={styles.quotaSwitcher}
      onClick={(event) => event.stopPropagation()}
    >
      <Chip
        size="small"
        label={t("default_end_page")}
        color={selected ? "default" : "primary"}
        variant={selected ? "outlined" : "filled"}
        onClick={() => select(null)}
      />
      {quotas.map((quota, index) => (
        <Chip
          key={quota.code}
          size="small"
          color={selected === quota.code ? "primary" : "default"}
          variant={selected === quota.code ? "filled" : "outlined"}
          onClick={() => select(quota.code)}
          label={
            <span className={styles.quotaChipLabel}>
              {quota.label || `QT${index + 1}`}
              {!isNotEmptyHtml(content?.[quotaMessageKey(quota.code)]) && (
                <Tooltip title={t("quota_message_missing")}>
                  <Box
                    component="span"
                    className={styles.quotaMissingDot}
                    sx={{ bgcolor: "warning.main" }}
                  />
                </Tooltip>
              )}
            </span>
          }
        />
      ))}
      {designMode == DESIGN_SURVEY_MODE.DESIGN && (
        <Button
          size="small"
          sx={{ marginInlineStart: "auto", textTransform: "none" }}
          startIcon={<SettingsOutlinedIcon fontSize="small" />}
          onClick={() =>
            navigate(
              `${routes.editSurvey.replace(":surveyId", surveyId)}?${QUOTA_PARAM}=${encodeURIComponent(selected || "")}`,
            )
          }
        >
          {t("manage_quotas")}
        </Button>
      )}
    </Box>
  );
});

export const QuotaMessageEditor = React.memo(function QuotaMessageEditor({
  t,
  quotaCode,
  designMode,
  mainLang,
}) {
  const theme = useTheme();
  return (
    <Box
      className={styles.groupHeader}
      css={css`
        font-size: ${theme.textStyles.group.size}px;
      `}
      onClick={(event) => event.stopPropagation()}
    >
      <ContentEditor
        editable={
          designMode == DESIGN_SURVEY_MODE.DESIGN ||
          designMode == DESIGN_SURVEY_MODE.LANGUAGES
        }
        code="Survey"
        extended={true}
        contentKey={quotaMessageKey(quotaCode)}
        placeholder={t("quota_message_placeholder", { lng: mainLang })}
      />
    </Box>
  );
});
