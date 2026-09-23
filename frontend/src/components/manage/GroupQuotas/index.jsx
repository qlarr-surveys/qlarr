import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Button,
  Chip,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { Add, DeleteOutline, ExpandLess, ExpandMore } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useService } from "~/hooks/use-service";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { addQuota, removeQuota, updateQuota } from "~/state/design/designState";
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

  const countsByCode = useMemo(
    () =>
      Object.fromEntries(
        (status?.quotas || []).map((quota) => [quota.code, quota.count]),
      ),
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

  const toggle = (quota) =>
    setExpanded(expanded === quota.code ? null : quota.code);

  return (
    <Box className={styles.container}>
      <Box className={styles.header}>
        <CustomTooltip body={t("tooltips.group_quotas")} />
        <Typography color="#1a2052" fontWeight="600" variant="subtitle1">
          {t("group_quotas.title")}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {t("group_quotas.description")}
      </Typography>
      {published === false && (
        <Typography variant="body2" color="warning.main">
          {t("group_quotas.unpublished_note")}
        </Typography>
      )}

      {quotas.length === 0 && (
        <Typography variant="body2" className={styles.empty}>
          {t("group_quotas.empty")}
        </Typography>
      )}

      {quotas.map((quota) => (
        <QuotaCard
          key={quota.code}
          quota={quota}
          count={countsByCode[quota.code] ?? 0}
          errors={errorsByCode[quota.code] || []}
          expanded={!disabled && expanded === quota.code}
          onToggle={() => toggle(quota)}
          disabled={disabled}
          fields={fields}
          designState={designState}
          componentIndex={componentIndex}
          mainLang={mainLang}
          langList={langList}
          t={t}
          tDesign={tDesign}
        />
      ))}

      {!disabled && (
        <Box className={styles.actions}>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={() => dispatch(addQuota())}
          >
            {t("group_quotas.add")}
          </Button>
        </Box>
      )}
    </Box>
  );
}

function QuotaCard({
  quota,
  count,
  errors,
  expanded,
  onToggle,
  disabled,
  fields,
  designState,
  componentIndex,
  mainLang,
  langList,
  t,
  tDesign,
}) {
  const dispatch = useDispatch();
  const limit = quota.limit > 0 ? quota.limit : 0;
  const full = limit > 0 && count >= limit;
  const description = describeCondition(quota.condition?.logic, fields, t, tDesign);

  const update = (changes) =>
    dispatch(updateQuota({ code: quota.code, changes }));

  const onLogicChange = useCallback(
    ({ jsonLogic, isEmpty }) => {
      const logic = isEmpty ? null : jsonLogic;
      dispatch(updateQuota({ code: quota.code, changes: { condition: { logic } } }));
    },
    [dispatch, quota.code],
  );

  return (
    <Box className={`${styles.card} ${full ? styles.cardFull : ""}`}>
      <Box
        className={`${styles.cardHeader} ${disabled ? styles.cardHeaderStatic : ""}`}
        onClick={disabled ? undefined : onToggle}
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
          <Typography variant="body2" fontWeight={600}>
            {limit > 0
              ? `${count} / ${limit}`
              : `${count} / ${t("group_quotas.no_limit")}`}
          </Typography>
          {!disabled && (expanded ? <ExpandLess /> : <ExpandMore />)}
        </Box>
      </Box>

      {errors.length > 0 && (
        <Typography variant="caption" color="error" display="block">
          {t("group_quotas.condition_error")}
        </Typography>
      )}

      {expanded && (
        <Box className={styles.cardBody}>
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
            fullWidth
            label={t("group_quotas.limit")}
            helperText={t("group_quotas.limit_hint")}
            value={limit > 0 ? limit : ""}
            inputProps={{ min: 0, inputMode: "numeric" }}
            onChange={(event) => {
              const value = parseInt(event.target.value, 10);
              update({ limit: Number.isInteger(value) && value > 0 ? value : 0 });
            }}
          />
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
          <Box className={styles.cardFooter}>
            <IconButton
              aria-label={t("action_btn.delete")}
              onClick={() => dispatch(removeQuota(quota.code))}
            >
              <DeleteOutline />
            </IconButton>
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
      return [field?.label || rule.field, operatorLabel, formatValue(rule.value, field)]
        .filter((part) => part !== "" && part != null)
        .join(" ");
    });
  const joiner = tree.conjunction === "or" ? t("group_quotas.or") : t("group_quotas.and");
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
