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

// The quota whose end message the END page shows in the designer, or null for
// the default end page (also when the selected quota was removed).
export function useSelectedQuotaMessage() {
  return useSelector((state) => {
    const code = state.designState.quotaMessageView?.code;
    const exists = state.designState.Survey?.quotas?.some(
      (quota) => quota.code === code,
    );
    return exists ? code : null;
  });
}

// Chips on the END page switching between the default end page and the end
// message of each quota, shown instead of the END page to respondents a full
// quota screened out. Quotas themselves are managed in Settings.
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

// A quota's end message, edited (and translated) in place of the END page.
// Stored in Survey content so it is translated like any other survey text.
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
        font-size: ${theme.textStyles.text.size}px;
      `}
      // The END page's setup options don't apply to a quota message.
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
