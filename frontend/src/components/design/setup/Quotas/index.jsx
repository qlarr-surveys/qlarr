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
import {
  addQuota,
  removeQuota,
  setQuotaHighlight,
  updateQuota,
} from "~/state/design/designState";
import { isGroup, isQuestion } from "~/utils/design/utils";
import { QlarrLogicBuilderInlineWrapper } from "../logic/QlarrLogicBuilder";
import { useFieldConfig } from "../logic/QlarrLogicBuilder/hooks/useFieldConfig";
import { jsonLogicToTree } from "../logic/QlarrLogicBuilder/utils/jsonLogic";
import { OPERATORS } from "../logic/QlarrLogicBuilder/config/operators";
import styles from "./Quotas.module.css";

function Quotas() {
  const dispatch = useDispatch();
  const designService = useService("design");
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);

  const designState = useSelector((state) => state.designState);
  const survey = designState.Survey;
  const quotas = useMemo(() => survey?.quotas || [], [survey?.quotas]);
  const componentIndex = designState.componentIndex;
  const isSaving = designState.isSaving;
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
    t,
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

  const highlight = useCallback(
    (quota) => {
      const codes = referencedCodes(quota?.condition?.logic, componentIndex);
      dispatch(setQuotaHighlight(codes));
      if (codes.length) {
        document
          .querySelector(`[data-code="${codes[0]}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [componentIndex, dispatch],
  );

  useEffect(() => () => dispatch(setQuotaHighlight([])), [dispatch]);

  const toggle = (quota) => {
    if (expanded === quota.code) {
      setExpanded(null);
      dispatch(setQuotaHighlight([]));
    } else {
      setExpanded(quota.code);
      highlight(quota);
    }
  };

  return (
    <Box className={styles.container}>
      <Box className={styles.header}>
        <CustomTooltip body={tTooltips("quotas")} />
        <Typography fontWeight={700}>{t("quotas")}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {t("quotas_description")}
      </Typography>

      {quotas.length === 0 && (
        <Typography variant="body2" className={styles.empty}>
          {t("quotas_empty")}
        </Typography>
      )}

      {quotas.map((quota) => (
        <QuotaCard
          key={quota.code}
          quota={quota}
          count={countsByCode[quota.code] ?? 0}
          errors={errorsByCode[quota.code] || []}
          expanded={expanded === quota.code}
          onToggle={() => toggle(quota)}
          fields={fields}
          designState={designState}
          componentIndex={componentIndex}
          mainLang={mainLang}
          langList={langList}
          onHighlight={highlight}
          t={t}
        />
      ))}

      <Box className={styles.actions}>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={() => dispatch(addQuota())}
        >
          {t("add_quota")}
        </Button>
      </Box>
    </Box>
  );
}

function QuotaCard({
  quota,
  count,
  errors,
  expanded,
  onToggle,
  fields,
  designState,
  componentIndex,
  mainLang,
  langList,
  onHighlight,
  t,
}) {
  const dispatch = useDispatch();
  const limit = quota.limit > 0 ? quota.limit : 0;
  const full = limit > 0 && count >= limit;
  const description = describeCondition(quota.condition?.logic, fields, t);

  const update = (changes) =>
    dispatch(updateQuota({ code: quota.code, changes }));

  const onLogicChange = useCallback(
    ({ jsonLogic, isEmpty }) => {
      const logic = isEmpty ? null : jsonLogic;
      dispatch(updateQuota({ code: quota.code, changes: { condition: { logic } } }));
      onHighlight({ condition: { logic } });
    },
    [dispatch, quota.code, onHighlight],
  );

  return (
    <Box className={`${styles.card} ${full ? styles.cardFull : ""}`}>
      <Box className={styles.cardHeader} onClick={onToggle}>
        <Box className={styles.cardTitle}>
          <Typography fontWeight={600} noWrap>
            {quota.label || t("quota_untitled")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description || t("quota_no_condition")}
          </Typography>
        </Box>
        <Box className={styles.cardMeta}>
          {full ? (
            <Chip size="small" color="error" label={t("quota_full")} />
          ) : null}
          <Typography variant="body2" fontWeight={600}>
            {limit > 0 ? `${count} / ${limit}` : `${count} / ${t("quota_no_limit")}`}
          </Typography>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </Box>
      </Box>

      {errors.length > 0 && (
        <Typography variant="caption" color="error" display="block">
          {t("quota_condition_error")}
        </Typography>
      )}

      {expanded && (
        <Box className={styles.cardBody}>
          <TextField
            size="small"
            fullWidth
            label={t("quota_label")}
            value={quota.label || ""}
            onChange={(event) => update({ label: event.target.value })}
          />
          <TextField
            size="small"
            type="number"
            fullWidth
            label={t("quota_limit")}
            helperText={t("quota_limit_hint")}
            value={limit > 0 ? limit : ""}
            inputProps={{ min: 0, inputMode: "numeric" }}
            onChange={(event) => {
              const value = parseInt(event.target.value, 10);
              update({ limit: Number.isInteger(value) && value > 0 ? value : 0 });
            }}
          />
          <Typography variant="body2" fontWeight={600}>
            {t("quota_condition")}
          </Typography>
          <QlarrLogicBuilderInlineWrapper
            code="Survey"
            jsonLogic={quota.condition?.logic}
            onChange={onLogicChange}
            componentIndices={componentIndex}
            designState={designState}
            mainLang={mainLang}
            langList={langList}
            t={t}
          />
          <Box className={styles.cardFooter}>
            <IconButton
              aria-label={t("delete")}
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
function describeCondition(logic, fields, t) {
  if (!logic) return "";
  const tree = jsonLogicToTree(logic, fields);
  const fieldMap = new Map(fields.map((field) => [field.code, field]));
  const parts = tree.children
    .filter((node) => node.type === "rule")
    .map((rule) => {
      const field = fieldMap.get(rule.field);
      const operator = OPERATORS[rule.operator];
      const operatorLabel = operator
        ? t(operator.labelKey, { defaultValue: operator.displayLabel })
        : rule.operator;
      return [field?.label || rule.field, operatorLabel, formatValue(rule.value, field)]
        .filter((part) => part !== "" && part != null)
        .join(" ");
    });
  const joiner = tree.conjunction === "or" ? t("quota_or") : t("quota_and");
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

/** Page/question codes a condition references, for outlining them on the canvas. */
function referencedCodes(logic, componentIndex) {
  const vars = [];
  const collect = (node) => {
    if (Array.isArray(node)) {
      node.forEach(collect);
    } else if (node && typeof node === "object") {
      if (typeof node.var === "string") {
        vars.push(node.var);
      }
      Object.values(node).forEach(collect);
    }
  };
  collect(logic);
  const componentCodes = (componentIndex || [])
    .map((item) => item.code)
    .filter((code) => isQuestion(code) || isGroup(code))
    .sort((a, b) => b.length - a.length);
  const codes = vars
    .map((name) => componentCodes.find((code) => name === code || name.startsWith(code)))
    .filter(Boolean);
  return [...new Set(codes)];
}

export default React.memo(Quotas);
