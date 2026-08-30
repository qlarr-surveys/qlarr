import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';

function Metric({ label, value, warn }) {
  return (
    <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ color: warn ? 'warning.main' : 'success.main' }}>
        {value}
      </Typography>
    </Box>
  );
}

/** Editable weight targets + weighted/effective base + efficiency. */
export default function WeightPanel({ weightDef, config, updateConfig, weighting }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  if (!weightDef) return null;

  const targets = config.targets[config.weightVar] ?? {};
  const sum = Object.values(targets).reduce((a, b) => a + (Number(b) || 0), 0);
  const offTarget = Math.abs(sum - 100) > 0.5;

  // Observed sample distribution per category (reference for the targets).
  const actualByCode = {};
  for (const c of weighting?.categories ?? []) actualByCode[c.code] = c;
  const actualTotal = (weighting?.categories ?? []).reduce((a, c) => a + c.count, 0);

  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('crosstabs.targets_title', 'Targets — the mix you want the results to reflect')}
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell align="right" sx={{ color: 'text.secondary' }}>
                {t('crosstabs.actual', 'Actual')}
              </TableCell>
              <TableCell align="right" sx={{ color: 'text.secondary' }}>
                {t('crosstabs.target', 'Target')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weightDef.categories.map((cat) => {
              const actual = actualByCode[cat.code];
              return (
                <TableRow key={cat.code}>
                  <TableCell>{cat.label}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {actual
                      ? t('crosstabs.actual_value', {
                          count: actual.count,
                          pct: Math.round(actual.share * 100),
                          defaultValue: '{{count}} · {{pct}}%',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ width: 130 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={targets[cat.code] ?? ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        updateConfig({
                          type: 'SET_TARGET',
                          weightVar: config.weightVar,
                          category: cat.code,
                          value: Number.isNaN(v) ? 0 : v,
                        });
                      }}
                      InputProps={{ endAdornment: '%' }}
                      sx={{ width: 110 }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>{t('crosstabs.total', 'Total')}</TableCell>
              <TableCell align="right" sx={{ color: 'text.secondary' }}>
                {actualTotal > 0 ? t('crosstabs.actual_value', {
                  count: actualTotal,
                  pct: 100,
                  defaultValue: '{{count}} · {{pct}}%',
                }) : '—'}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 600, color: offTarget ? 'warning.main' : 'text.secondary' }}
              >
                {sum.toFixed(1)}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      {weighting && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1.5,
            mt: 2,
          }}
        >
          <Metric label={t('crosstabs.weighted_base', 'Weighted base')} value={weighting.weightedBase} />
          <Metric label={t('crosstabs.effective_base', 'Effective base')} value={weighting.effectiveBase} />
          <Metric
            label={t('crosstabs.efficiency', 'Efficiency')}
            value={`${Math.round(weighting.efficiency * 100)}%`}
            warn={weighting.efficiency < 0.6}
          />
        </Box>
      )}

      {weighting && (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
          {t('crosstabs.weight_note', {
            maxWeight: weighting.maxWeight,
            defaultValue:
              'Largest weight {{maxWeight}}. Significance tests use the effective base, not the weighted base.',
          })}
        </Typography>
      )}
    </Box>
  );
}
