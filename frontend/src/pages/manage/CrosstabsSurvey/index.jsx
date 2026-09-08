import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Paper, Typography } from '@mui/material';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import { useService } from '~/hooks/use-service';
import LoadingDots from '~/components/common/LoadingDots';
import {
  configReducer,
  defaultTargets,
  initialConfig,
  toRequest,
} from '~/analytics/crosstabs/config';
import { loadPlans, newPlanId, savePlans } from '~/analytics/crosstabs/storage';
import { crosstabToCsv, downloadCsv } from '~/analytics/crosstabs/csv';
import TabPlansPanel from '~/components/analytics/crosstabs/TabPlansPanel';
import CrosstabControls from '~/components/analytics/crosstabs/CrosstabControls';
import WeightPanel from '~/components/analytics/crosstabs/WeightPanel';
import CrosstabTable from '~/components/analytics/crosstabs/CrosstabTable';
import CrosstabWarnings from '~/components/analytics/crosstabs/CrosstabWarnings';

const COMPUTE_DEBOUNCE_MS = 350;

function EmptyCard({ children }) {
  return (
    <Box sx={{ p: 3, maxWidth: 1240, mx: 'auto' }}>
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {children}
        </Typography>
      </Paper>
    </Box>
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

  const [result, setResult] = useState(null);
  const [computeError, setComputeError] = useState(null);
  const computeSeq = useRef(0);
  const debounceRef = useRef(null);

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

  // --- debounced compute on config change ---
  const sameVar = config && config.rowVar === config.colVar;
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
            setResult(data);
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
  }, [config, surveyId]);

  if (loading) return <LoadingDots fullHeight />;
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

  const handleSavePlan = () => {
    const name =
      rowVar && colVar
        ? `${rowVar.label} × ${colVar.label}`
        : t('crosstabs.untitled_plan', 'Untitled plan');
    const plan = { id: newPlanId(), name, config: JSON.parse(JSON.stringify(config)) };
    const next = [...plans, plan];
    setPlans(next);
    setActivePlanId(plan.id);
    savePlans(surveyId, next);
  };

  const handleSelectPlan = (plan) => {
    updateConfig({ type: 'LOAD', config: JSON.parse(JSON.stringify(plan.config)) });
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
    if (result) downloadCsv(crosstabToCsv(result, rowVar?.label));
  };

  return (
    <Box
      sx={{
        p: 5,
        maxWidth: 1240,
        mx: 'auto',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 3fr)' },
        gap: 5,
        alignItems: 'start',
      }}
    >
      <TabPlansPanel
        plans={plans}
        activePlanId={activePlanId}
        onSelect={handleSelectPlan}
        onNew={handleNewPlan}
        onDelete={handleDeletePlan}
      />

      <Box sx={{ minWidth: 0 }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
          <CrosstabControls
            catalogue={catalogue}
            config={config}
            updateConfig={updateConfig}
            onExport={handleExport}
            onSavePlan={handleSavePlan}
            canExport={!!result && !sameVar}
          />
          {weightDef && (
            <WeightPanel
              weightDef={weightDef}
              config={config}
              updateConfig={updateConfig}
              weighting={result?.weighting}
            />
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          {sameVar ? (
            <Typography variant="body1" color="text.secondary">
              {t('crosstabs.pick_two', 'Pick two different questions for rows and columns.')}
            </Typography>
          ) : computeError ? (
            <Typography variant="body1" color="error">
              {computeError}
            </Typography>
          ) : !result ? (
            <LoadingDots />
          ) : (
            <>
              <Typography variant="h6">{rowVar?.label}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('crosstabs.subtitle', {
                  column: colVar?.label,
                  weighting: weightDef
                    ? t('crosstabs.weighted_on', { label: weightDef.label, defaultValue: 'weighted on {{label}}' })
                    : t('crosstabs.unweighted', 'unweighted'),
                  defaultValue: 'By {{column}} · {{weighting}}',
                })}
                {result.multi ? ` · ${t('crosstabs.multi_note', 'multi-select: columns can exceed 100%')}` : ''}
              </Typography>
              <CrosstabTable result={result} options={config.options} />
              {result.notAnswered > 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                  {t('crosstabs.not_answered', { count: result.notAnswered, defaultValue: 'Not answered: {{count}}' })}
                </Typography>
              )}
              <CrosstabWarnings warnings={result.warnings} />
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default React.memo(CrosstabsSurvey);
