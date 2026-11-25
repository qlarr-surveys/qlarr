import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import { useService } from '~/hooks/use-service';
import LoadingDots from '~/components/common/LoadingDots';
import {
  configReducer,
  defaultTargets,
  describeFilters,
  initialConfig,
  sanitizeConfig,
  toRequest,
} from '~/analytics/crosstabs/config';
import { loadPlans, newPlanId, savePlans } from '~/analytics/crosstabs/storage';
import { crosstabToCsv, downloadCsv } from '~/analytics/crosstabs/csv';
import TabPlansPanel from '~/components/analytics/crosstabs/TabPlansPanel';
import CrosstabControls from '~/components/analytics/crosstabs/CrosstabControls';
import CrosstabFilters from '~/components/analytics/crosstabs/CrosstabFilters';
import SavePlanDialog from '~/components/analytics/crosstabs/SavePlanDialog';
import WeightPanel from '~/components/analytics/crosstabs/WeightPanel';
import CrosstabTable from '~/components/analytics/crosstabs/CrosstabTable';
import CrosstabWarnings from '~/components/analytics/crosstabs/CrosstabWarnings';
import styles from '~/components/analytics/crosstabs/Crosstabs.module.css';

const COMPUTE_DEBOUNCE_MS = 350;

/** Wraps text in Unicode first-strong isolates (FSI … PDI). */
const isolate = (text) => `\u2068${text}\u2069`;

/** A message alone on the canvas, for the states with no setup to show. */
function EmptyCard({ children }) {
  return (
    <div className={styles.canvas}>
      <div className={styles.column}>
        <div role="status" className={styles.notice}>
          {children}
        </div>
      </div>
    </div>
  );
}

function CrosstabsSurvey() {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const surveyService = useService('survey');
  const { surveyId } = useParams();

  const [loading, setLoading] = useState(true);
  const [catalogue, setCatalogue] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [config, updateConfig] = useReducer(configReducer, null);
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const [result, setResult] = useState(null);
  const [computeError, setComputeError] = useState(null);
  const computeSeq = useRef(0);
  const debounceRef = useRef(null);
  // The editor's numbering ("Q5"), when the design is loaded (survey admins).
  const codeIndex = useSelector((state) => state.designState?.index);
  const codeOf = (id) => codeIndex?.[id];
  // Labels are isolated so a Latin question title keeps its own order inside
  // an Arabic line (and the reverse), even where only plain text can go: the
  // native select's options, a tooltip, a sentence.
  const nameOf = (id, label) =>
    codeOf(id) ? `${codeOf(id)} · ${isolate(label)}` : isolate(label);

  // --- load catalogue + saved plans once ---
  useEffect(() => {
    setLoading(true);
    surveyService
      .getCrosstabCatalogue(surveyId)
      .then((data) => {
        setCatalogue(data);
        updateConfig({ type: 'LOAD', config: initialConfig(data) });
        setPlans(loadPlans(surveyId));
        setLoadError(null);
      })
      .catch((err) => setLoadError(err.message || t('crosstabs.error_loading', 'Failed to load crosstabs')))
      .finally(() => setLoading(false));
  }, [surveyId]);

  // --- seed default targets when a weight variable is first chosen ---
  useEffect(() => {
    if (!config?.weightVar || !catalogue) return;
    if (config.targets[config.weightVar]) return;
    const weightDef = catalogue.colVariables.find((c) => c.code === config.weightVar);
    if (weightDef) {
      updateConfig({
        type: 'SET_TARGETS',
        weightVar: config.weightVar,
        targets: defaultTargets(weightDef.categories),
      });
    }
  }, [config?.weightVar, catalogue]);

  // --- debounced compute on request change ---
  // Keyed on the request body, not `config`: edits that don't change it (a
  // filter with no categories picked yet) don't refetch the same table.
  const sameVar = config && config.rowVar === config.colVar;
  const requestKey = config ? JSON.stringify(toRequest(config)) : null;
  useEffect(() => {
    if (!config || !config.rowVar || !config.colVar || sameVar) {
      setResult(null);
      return undefined;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const seq = ++computeSeq.current;
    debounceRef.current = setTimeout(() => {
      surveyService
        .computeCrosstab(surveyId, toRequest(config))
        .then((data) => {
          if (seq === computeSeq.current) {
            // Keep the config that produced this result, so the filter line
            // and the export describe the table shown, not pending edits.
            setResult({ ...data, config });
            setComputeError(null);
          }
        })
        .catch((err) => {
          if (seq === computeSeq.current) {
            setComputeError(err.message || t('crosstabs.error_computing', 'Failed to compute crosstab'));
          }
        });
    }, COMPUTE_DEBOUNCE_MS);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, surveyId]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <LoadingDots fullHeight />
      </div>
    );
  }
  if (loadError) return <EmptyCard>{loadError}</EmptyCard>;
  if (!catalogue || !config) return null;

  if (catalogue.totalResponses === 0) {
    return <EmptyCard>{t('crosstabs.zero_responses', 'No completed responses to cross-tabulate yet.')}</EmptyCard>;
  }
  if ((catalogue.rowVariables?.length ?? 0) < 1 || (catalogue.colVariables?.length ?? 0) < 1) {
    return (
      <EmptyCard>
        {t(
          'crosstabs.not_enough_questions',
          'Crosstabs need at least one single-choice question for the banner and one question for the rows.',
        )}
      </EmptyCard>
    );
  }

  const weightDef = config.weightVar
    ? catalogue.colVariables.find((c) => c.code === config.weightVar)
    : null;
  const rowVar = catalogue.rowVariables.find((v) => v.id === config.rowVar);
  const colVar = catalogue.colVariables.find((v) => v.code === config.colVar);

  const defaultPlanName =
    rowVar && colVar
      ? `${rowVar.label} × ${colVar.label}`
      : t('crosstabs.untitled_plan', 'Untitled plan');
  const filterSummary = result ? describeFilters(result.config, catalogue) : [];
  // Labels of the table shown, which may lag a pending config edit.
  const resultRowLabel = result
    ? catalogue.rowVariables.find((v) => v.id === result.config.rowVar)?.label
    : undefined;
  const resultColLabel = result
    ? catalogue.colVariables.find((c) => c.code === result.config.colVar)?.label
    : undefined;
  const resultWeightLabel = result?.config.weightVar
    ? catalogue.colVariables.find((c) => c.code === result.config.weightVar)?.label
    : undefined;

  const handleSavePlan = (name) => {
    setSaveDialogOpen(false);
    const plan = { id: newPlanId(), name, config: JSON.parse(JSON.stringify(config)) };
    const next = [...plans, plan];
    setPlans(next);
    setActivePlanId(plan.id);
    savePlans(surveyId, next);
  };

  const handleSelectPlan = (plan) => {
    updateConfig({
      type: 'LOAD',
      config: sanitizeConfig(JSON.parse(JSON.stringify(plan.config)), catalogue),
    });
    setActivePlanId(plan.id);
  };

  const handleNewPlan = () => {
    updateConfig({ type: 'LOAD', config: initialConfig(catalogue) });
    setActivePlanId(null);
  };

  const handleDeletePlan = (id) => {
    const next = plans.filter((p) => p.id !== id);
    setPlans(next);
    savePlans(surveyId, next);
    if (activePlanId === id) setActivePlanId(null);
  };

  const handleExport = () => {
    if (result) downloadCsv(crosstabToCsv(result, resultRowLabel, filterSummary));
  };

  const resultRowCode = result ? codeOf(result.config.rowVar) : undefined;

  const resultBody = sameVar ? (
    <p className={styles.message}>
      {t('crosstabs.pick_two', 'Pick two different questions for rows and columns.')}
    </p>
  ) : computeError ? (
    <p role="alert" className={`${styles.message} ${styles.messageError}`}>
      {computeError}
    </p>
  ) : !result ? (
    <LoadingDots />
  ) : (
    <>
      <h2 className={styles.cardTitle}>
        {resultRowCode && <span className={styles.code}>{resultRowCode} · </span>}
        <bdi>{resultRowLabel}</bdi>
      </h2>
      <p className={styles.cardNote}>
        {t('crosstabs.subtitle', {
          column: nameOf(result.config.colVar, resultColLabel),
          weighting: resultWeightLabel
            ? t('crosstabs.weighted_on', {
                label: isolate(resultWeightLabel),
                defaultValue: 'weighted on {{label}}',
              })
            : t('crosstabs.unweighted', 'unweighted'),
          defaultValue: 'By {{column}} · {{weighting}}',
        })}
        {result.multi ? ` · ${t('crosstabs.multi_note', 'multi-select: columns can exceed 100%')}` : ''}
      </p>
      {filterSummary.length > 0 && (
        <p className={styles.cardNote}>
          {t('crosstabs.filtered_base', {
            count: result.filteredResponses,
            total: result.totalResponses,
            defaultValue: 'Filtered to {{count}} of {{total}} responses',
          })}
          {': '}
          {filterSummary
            .map((f) => `${isolate(f.label)} = ${isolate(f.values.join(', '))}`)
            .join(' · ')}
        </p>
      )}
      <CrosstabTable
        result={result}
        options={config.options}
        corner={resultRowCode}
        caption={t('crosstabs.table_caption', {
          row: resultRowLabel,
          column: resultColLabel,
        })}
      />
      <p className={styles.tableNote}>
        {t('crosstabs.heat_note')}
        {result.notAnswered > 0 &&
          ` ${t('crosstabs.not_answered', {
            count: result.notAnswered,
            defaultValue: 'Not answered: {{count}}',
          })}`}
      </p>
      <CrosstabWarnings warnings={result.warnings} />
    </>
  );

  return (
    <div className={styles.workspace}>
      <nav aria-labelledby="crosstab-setup-title" className={styles.rail}>
        <h3 id="crosstab-setup-title" className={styles.railTitle}>
          {t('crosstabs.setup')}
        </h3>
        <div className={styles.railBody}>
          <button type="button" className={styles.btn} onClick={handleNewPlan}>
            <Plus size={16} aria-hidden="true" />
            {t('crosstabs.new_plan', 'New tab plan')}
          </button>
          <CrosstabControls
            catalogue={catalogue}
            config={config}
            updateConfig={updateConfig}
            onExport={handleExport}
            onSavePlan={() => setSaveDialogOpen(true)}
            canExport={!!result && !sameVar}
            nameOf={nameOf}
            filters={
              <CrosstabFilters
                catalogue={catalogue}
                config={config}
                updateConfig={updateConfig}
                nameOf={nameOf}
              />
            }
          />
        </div>
        <TabPlansPanel
          plans={plans}
          activePlanId={activePlanId}
          onSelect={handleSelectPlan}
          onDelete={handleDeletePlan}
        />
      </nav>

      <div className={styles.canvas}>
        <div className={styles.column}>
          <div className={styles.card}>{resultBody}</div>

          {weightDef && (
            <WeightPanel
              weightDef={weightDef}
              title={nameOf(weightDef.code, weightDef.label)}
              config={config}
              updateConfig={updateConfig}
              weighting={result?.weighting}
              filteredCount={filterSummary.length ? result.filteredResponses : null}
            />
          )}
        </div>
      </div>

      <SavePlanDialog
        open={saveDialogOpen}
        defaultName={defaultPlanName}
        existingNames={plans.map((p) => p.name)}
        onCancel={() => setSaveDialogOpen(false)}
        onSave={handleSavePlan}
      />
    </div>
  );
}

export default React.memo(CrosstabsSurvey);
