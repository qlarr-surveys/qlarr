import { useId } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import { MUTED_CELL, TABLE_SX } from '../common/styles';
import styles from './Crosstabs.module.css';

function Metric({ label, value, tone }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div
        className={`${styles.metricValue} ${
          tone === 'warn'
            ? styles.metricWarn
            : tone === 'good'
              ? styles.metricGood
              : ''
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Editable weight targets + weighted/effective base + efficiency, as a card
 * under the table. `title` names the weight question.
 */
export default function WeightPanel({
  weightDef,
  title,
  config,
  updateConfig,
  weighting,
  filteredCount,
}) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const titleId = useId();
  if (!weightDef) return null;

  const targets = config.targets[config.weightVar] ?? {};
  const sum = Object.values(targets).reduce((a, b) => a + (Number(b) || 0), 0);
  const offTarget = Math.abs(sum - 100) > 0.5;

  // Observed sample distribution per category (reference for the targets).
  const actualByCode = {};
  for (const c of weighting?.categories ?? []) actualByCode[c.code] = c;
  const actualTotal = (weighting?.categories ?? []).reduce(
    (a, c) => a + c.count,
    0,
  );

  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <h3
        id={titleId}
        className={`${styles.cardTitle} ${styles.cardTitleSmall}`}
      >
        {title}
      </h3>
      <p className={styles.cardNote}>
        {t(
          'crosstabs.targets_title',
          'Targets — the mix you want the results to reflect',
        )}
      </p>

      <TableContainer sx={{ ...TABLE_SX, mt: '16px' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell align="right">
                {t('crosstabs.actual', 'Actual')}
              </TableCell>
              <TableCell align="right">
                {t('crosstabs.target', 'Target')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weightDef.categories.map((cat) => {
              const actual = actualByCode[cat.code];
              return (
                <TableRow key={cat.code}>
                  <TableCell sx={{ verticalAlign: 'middle !important' }}>
                    <bdi>{cat.label}</bdi>
                  </TableCell>
                  <TableCell
                    align="right"
                    className={MUTED_CELL}
                    sx={{
                      whiteSpace: 'nowrap',
                      verticalAlign: 'middle !important',
                    }}
                  >
                    {actual
                      ? t('crosstabs.actual_value', {
                          count: actual.count,
                          pct: Math.round(actual.share * 100),
                          defaultValue: '{{count}} · {{pct}}%',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ width: 130, py: '6px !important' }}
                  >
                    <label className={styles.targetInput}>
                      <input
                        type="number"
                        aria-label={`${cat.label} — ${t('crosstabs.target', 'Target')}`}
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
                      />
                      <span aria-hidden="true">%</span>
                    </label>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>
                {t('crosstabs.total', 'Total')}
              </TableCell>
              <TableCell align="right" className={MUTED_CELL}>
                {actualTotal > 0
                  ? t('crosstabs.actual_value', {
                      count: actualTotal,
                      pct: 100,
                      defaultValue: '{{count}} · {{pct}}%',
                    })
                  : '—'}
              </TableCell>
              <TableCell
                align="right"
                className={offTarget ? undefined : MUTED_CELL}
                sx={{
                  fontWeight: 600,
                  pr: '24px !important',
                  // Over TABLE_SX's body ink, which outranks a plain class.
                  ...(offTarget && { color: '#b3261e !important' }),
                }}
              >
                {sum.toFixed(1)}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Filters narrow the table, not the weights: say so where the full-sample figures sit. */}
      {weighting && filteredCount != null && (
        <div
          className={`${styles.warn} ${styles.info}`}
          style={{ marginTop: 12 }}
        >
          <Info size={16} aria-hidden="true" />
          <span>
            {t('crosstabs.weight_filtered_note', {
              total: actualTotal,
              filtered: filteredCount,
              defaultValue:
                'Filters are on. Actual and the weights come from all {{total}} responses, not just the {{filtered}} in the table. Each respondent keeps their full-sample weight, so the filtered table may not match the targets.',
            })}
          </span>
        </div>
      )}

      {weighting && (
        <div className={styles.metrics}>
          <Metric
            label={t('crosstabs.weighted_base', 'Weighted base')}
            value={weighting.weightedBase}
          />
          <Metric
            label={t('crosstabs.effective_base', 'Effective base')}
            value={weighting.effectiveBase}
          />
          <Metric
            label={t('crosstabs.efficiency', 'Efficiency')}
            value={`${Math.round(weighting.efficiency * 100)}%`}
            tone={weighting.efficiency < 0.6 ? 'warn' : 'good'}
          />
        </div>
      )}

      {weighting && (
        <p className={styles.weightNote}>
          {t('crosstabs.weight_note', {
            maxWeight: weighting.maxWeight,
            defaultValue:
              'Largest weight {{maxWeight}}. Significance tests use the effective base, not the weighted base.',
          })}
        </p>
      )}
    </section>
  );
}
