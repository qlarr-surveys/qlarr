import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add,
  DeleteOutline,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useService } from "~/hooks/use-service";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { addQuota, removeQuota, updateQuota } from "~/state/design/designState";
import {
  QUOTA_MESSAGE_PARAM,
  QUOTA_PARAM,
  quotaMessageKey,
} from "@qlarr/design-core/constants/design";
import { routes } from "~/routes";
import { isNotEmptyHtml } from "~/utils/design/utils";
import { QlarrLogicBuilderInlineWrapper } from "~/components/design/setup/logic/QlarrLogicBuilder";
import { useFieldConfig } from "~/components/design/setup/logic/QlarrLogicBuilder/hooks/useFieldConfig";
import { jsonLogicToTree } from "~/components/design/setup/logic/QlarrLogicBuilder/utils/jsonLogic";
import { OPERATORS } from "~/components/design/setup/logic/QlarrLogicBuilder/config/operators";
import styles from "./GroupQuotas.module.css";

// Per-group quotas live in the survey design (Survey.quotas), so edits here
// auto-save as a design change and only apply to respondents once published.
function GroupQuotas({ disabled }) {
  const dispatch = useDispatch();
  const designService = useService("design");
  const { t } = useTranslation(NAMESPACES.MANAGE);
  // the logic builder and operator labels read from the designer namespace
  const { t: tDesign } = useTranslation(NAMESPACES.DESIGN_CORE);

  const designState = useSelector((state) => state.designState);
  const survey = designState.Survey;
  const quotas = useMemo(() => survey?.quotas || [], [survey?.quotas]);
  const componentIndex = designState.componentIndex;
  const isSaving = designState.isSaving;
  const published = designState.versionDto?.published;
  const mainLang = designState.langInfo?.mainLang;
  const langList = useMemo(
    () => designState.langInfo?.languagesList?.map((lang) => lang.code) || [],
    [designState.langInfo?.languagesList],
  );

  const fields = useFieldConfig(
    componentIndex,
    "Survey",
    designState,
    mainLang,
    langList,
    tDesign,
  );

  const [status, setStatus] = useState(null);
  const [expanded, setExpanded] = useState(null);
  // Set by "Add quota": the quota it creates (appended, with a generated code)
  // opens once it is in the list.
  const expandAdded = useRef(false);
  useEffect(() => {
    if (expandAdded.current && quotas.length) {
      expandAdded.current = false;
      setExpanded(quotas[quotas.length - 1].code);
    }
  }, [quotas]);

  // Fill levels come from the server; refresh them whenever a save settles.
  useEffect(() => {
    if (isSaving) return;
    let cancelled = false;
    designService
      .getQuotaStatus()
      .then((data) => !cancelled && setStatus(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSaving]);

  // `full` follows the published limits, the ones respondents are held to.
  const statusByCode = useMemo(
    () =>
      Object.fromEntries((status?.quotas || []).map((quota) => [quota.code, quota])),
    [status],
  );

  const errorsByCode = useMemo(
    () =>
      Object.fromEntries(
        (survey?.instructionList || [])
          .filter((instruction) => instruction.code.startsWith("quota_"))
          .map((instruction) => [
            instruction.code.slice("quota_".length),
            instruction.errors || [],
          ]),
      ),
    [survey?.instructionList],
  );

  const navigate = useNavigate();
  const { surveyId } = useParams();

  // Quota messages are survey text, edited (and translated) on the END page in
  // the designer.
  const editMessage = (quotaCode) =>
    navigate(
      `${routes.designSurvey.replace(":surveyId", surveyId)}?${QUOTA_MESSAGE_PARAM}=${encodeURIComponent(quotaCode)}`,
    );

  const [searchParams, setSearchParams] = useSearchParams();
  const containerRef = useRef(null);

  // Opened from the END page in the designer: bring the quotas into view,
  // opening the quota whose message was selected there.
  useEffect(() => {
    if (!searchParams.has(QUOTA_PARAM)) {
      return;
    }
    const code = searchParams.get(QUOTA_PARAM);
    if (code && !disabled) {
      setExpanded(code);
    }
    searchParams.delete(QUOTA_PARAM);
    setSearchParams(searchParams, { replace: true });
    // Not cleared on re-run: removing the param re-runs this effect.
    setTimeout(() => {
      const card =
        code &&
        containerRef.current?.querySelector(
          `[data-quota="${CSS.escape(code)}"]`,
        );
      (card || containerRef.current)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }, [searchParams]);

  const toggle = (quota) =>
    setExpanded(expanded === quota.code ? null : quota.code);

  const addButton = !disabled && (
    <Button
      variant="outlined"
      size="small"
      startIcon={<Add />}
      onClick={() => {
        expandAdded.current = true;
        dispatch(addQuota());
      }}
    >
      {t("group_quotas.add")}
    </Button>
  );

  return (
    <Box className={styles.container} ref={containerRef}>
      <Box className={styles.header}>
        <Box className={styles.headerTitle}>
          <CustomTooltip body={t("tooltips.group_quotas")} />
          <Typography color="#1a2052" fontWeight="600" variant="subtitle1">
            {t("group_quotas.title")}
          </Typography>
        </Box>
        {quotas.length > 0 && addButton}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {t("group_quotas.description")}
      </Typography>
      {published === false && quotas.length > 0 && (
        <Box
          className={styles.notice}
          sx={{
            backgroundColor: "warning.lighter",
            border: 1,
            borderColor: "warning.light",
          }}
        >
          <Typography variant="body2" color="warning.dark">
            {t("group_quotas.unpublished_note")}
          </Typography>
        </Box>
      )}

      {quotas.length === 0 ? (
        <Box className={styles.empty}>
          <Typography variant="body2" color="text.secondary">
            {t("group_quotas.empty")}
          </Typography>
          {addButton}
        </Box>
      ) : (
        <Box className={styles.list}>
          {quotas.map((quota) => (
            <QuotaCard
              key={quota.code}
              quota={quota}
              count={statusByCode[quota.code]?.count ?? 0}
              full={statusByCode[quota.code]?.full ?? false}
              errors={errorsByCode[quota.code] || []}
              expanded={!disabled && expanded === quota.code}
              onToggle={() => toggle(quota)}
              disabled={disabled}
              fields={fields}
              designState={designState}
              componentIndex={componentIndex}
              mainLang={mainLang}
              langList={langList}
              hasMessage={isNotEmptyHtml(
                survey?.content?.[mainLang]?.[quotaMessageKey(quota.code)],
              )}
              onEditMessage={() => editMessage(quota.code)}
              t={t}
              tDesign={tDesign}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

function QuotaCard({
  quota,
  count,
  full,
  errors,
  expanded,
  onToggle,
  disabled,
  fields,
  designState,
  componentIndex,
  mainLang,
  langList,
  hasMessage,
  onEditMessage,
  t,
  tDesign,
}) {
  const dispatch = useDispatch();
  const limit = quota.limit > 0 ? quota.limit : 0;
  const description = describeCondition(
    quota.condition?.logic,
    fields,
    t,
    tDesign,
  );

  const update = (changes) =>
    dispatch(updateQuota({ code: quota.code, changes }));

  const onLogicChange = useCallback(
    ({ jsonLogic, isEmpty }) => {
      const logic = isEmpty ? null : jsonLogic;
      dispatch(
        updateQuota({ code: quota.code, changes: { condition: { logic } } }),
      );
    },
    [dispatch, quota.code],
  );

  return (
    <Box
      data-quota={quota.code}
      className={`${styles.card} ${full ? styles.cardFull : ""} ${
        expanded ? styles.cardExpanded : ""
      }`}
    >
      <Box
        className={`${styles.cardHeader} ${disabled ? styles.cardHeaderStatic : ""}`}
        onClick={disabled ? undefined : onToggle}
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? undefined : 0}
        aria-expanded={disabled ? undefined : expanded}
        onKeyDown={
          disabled
            ? undefined
            : (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle();
                }
              }
        }
      >
        <Box className={styles.cardTitle}>
          <Typography fontWeight={600} noWrap>
            {quota.label || t("group_quotas.untitled")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description || t("group_quotas.no_condition")}
          </Typography>
        </Box>
        <Box className={styles.cardMeta}>
          {full ? (
            <Chip size="small" color="error" label={t("group_quotas.full")} />
          ) : null}
          <Box className={styles.fill}>
            <Typography variant="body2" fontWeight={600} color="#1a2052">
              {count}
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
              >
                {" / "}
                {limit > 0 ? limit : t("group_quotas.no_limit")}
              </Typography>
            </Typography>
            {limit > 0 && (
              <LinearProgress
                variant="determinate"
                color={full ? "error" : "primary"}
                value={Math.min(100, (count / limit) * 100)}
                className={styles.fillBar}
              />
            )}
          </Box>
          {!disabled &&
            (expanded ? (
              <ExpandLess color="action" />
            ) : (
              <ExpandMore color="action" />
            ))}
        </Box>
      </Box>

      {errors.length > 0 && (
        <Typography
          variant="caption"
          color="error"
          display="block"
          className={styles.cardError}
        >
          {t("group_quotas.condition_error")}
        </Typography>
      )}

      {expanded && (
        <Box className={styles.cardBody}>
          <Box className={styles.fieldRow}>
            <TextField
              size="small"
              fullWidth
              label={t("group_quotas.label")}
              value={quota.label || ""}
              onChange={(event) => update({ label: event.target.value })}
            />
            <TextField
              size="small"
              type="number"
              className={styles.limitField}
              label={t("group_quotas.limit")}
              helperText={t("group_quotas.limit_hint")}
              value={limit > 0 ? limit : ""}
              inputProps={{ min: 0, inputMode: "numeric" }}
              onChange={(event) => {
                const value = parseInt(event.target.value, 10);
                update({
                  limit: Number.isInteger(value) && value > 0 ? value : 0,
                });
              }}
            />
          </Box>
          <Typography variant="body2" fontWeight={600}>
            {t("group_quotas.condition")}
          </Typography>
          <QlarrLogicBuilderInlineWrapper
            code="Survey"
            jsonLogic={quota.condition?.logic}
            onChange={onLogicChange}
            componentIndices={componentIndex}
            designState={designState}
            mainLang={mainLang}
            langList={langList}
            t={tDesign}
          />
          <Box className={styles.messageRow}>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {t("group_quotas.message")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {hasMessage
                  ? t("group_quotas.message_set")
                  : t("group_quotas.message_not_set")}
              </Typography>
            </Box>
            <Button size="small" onClick={onEditMessage}>
              {t("group_quotas.edit_message")}
            </Button>
          </Box>
          <Box className={styles.cardFooter}>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteOutline />}
              onClick={() => dispatch(removeQuota(quota.code))}
            >
              {t("action_btn.delete")}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/** "Gender includes Male and Age more than 18" from the quota's JSON Logic. */
function describeCondition(logic, fields, t, tDesign) {
  if (!logic) return "";
  const tree = jsonLogicToTree(logic, fields);
  const fieldMap = new Map(fields.map((field) => [field.code, field]));
  const parts = tree.children
    .filter((node) => node.type === "rule")
    .map((rule) => {
      const field = fieldMap.get(rule.field);
      const operator = OPERATORS[rule.operator];
      const operatorLabel = operator
        ? tDesign(operator.labelKey, { defaultValue: operator.displayLabel })
        : rule.operator;
      return [
        field?.label || rule.field,
        operatorLabel,
        formatValue(rule.value, field),
      ]
        .filter((part) => part !== "" && part != null)
        .join(" ");
    });
  const joiner =
    tree.conjunction === "or" ? t("group_quotas.or") : t("group_quotas.and");
  return parts.join(` ${joiner} `);
}

function formatValue(value, field) {
  if (value == null) return "";
  const values = Array.isArray(value) ? value : [value];
  const labels = values.map((item) => {
    const option = field?.options?.find((opt) => opt.value === item);
    return option ? option.label : String(item);
  });
  return labels.join(", ");
}

export default React.memo(GroupQuotas);
