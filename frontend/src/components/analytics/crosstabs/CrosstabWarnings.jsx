import { Alert, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';

/** Default English copy per warning code, with interpolated params. */
const DEFAULTS = {
  targetSum:
    "Targets add up to {{sum}}%, not 100%. Every figure below is off until that's fixed.",
  lowBase:
    '{{count}} of {{total}} columns fall under a base of 30. Percentages and tests are hidden there.',
  thinColumns:
    '{{count}} column(s) sit between 30 and 100. Read those differences with care.',
  lowEfficiency:
    'Efficiency is {{efficiency}}%. Below 60%, a small group starts driving the whole report.',
  highWeight:
    'One weight is {{maxWeight}}. Weights above 5 usually mean the target is unrealistic for this sample.',
  droppedWeight:
    '{{count}} response(s) had no answer to the weight question and were left out of this table.',
  truncated:
    'Showing the first {{shown}} of {{total}} responses. Figures and tests are based on that sample.',
};

// targetSum is the loudest problem; everything else is advisory.
const severityOf = (code) => (code === 'targetSum' ? 'error' : 'warning');

export default function CrosstabWarnings({ warnings }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  if (!warnings || warnings.length === 0) return null;

  return (
    <Stack spacing={1} sx={{ mt: 2 }}>
      {warnings.map((w, i) => (
        <Alert key={`${w.code}-${i}`} severity={severityOf(w.code)} variant="outlined">
          {t(`crosstabs.warn_${w.code}`, {
            ...(w.params ?? {}),
            defaultValue: DEFAULTS[w.code] ?? w.code,
          })}
        </Alert>
      ))}
    </Stack>
  );
}
