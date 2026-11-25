import { ArrowUpDown, ChevronDown, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import styles from './Crosstabs.module.css';

/** A labelled native select, as the phase-3.3 rail draws it. */
function Select({ label, value, onChange, children }) {
  return (
    <label className={styles.field}>
      {label}
      <span className={styles.selectWrap}>
        <select
          className={styles.select}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <span aria-hidden="true" className={styles.chevron}>
          <ChevronDown size={16} />
        </span>
      </span>
    </label>
  );
}

/**
 * The crosstab setup in the rail: rows, columns and weight, the answer
 * filters (passed in), what each cell shows, and export/save.
 * `nameOf(id, label)` prefixes the editor's question code when it has one.
 */
export default function CrosstabControls({
  catalogue,
  config,
  updateConfig,
  onExport,
  onSavePlan,
  canExport,
  nameOf,
  filters,
}) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const rowVars = catalogue.rowVariables ?? [];
  const colVars = catalogue.colVariables ?? [];
  // Only a single-choice question can be a column, so the rows can only move
  // across when they are one.
  const canSwap =
    config.rowVar !== config.colVar &&
    colVars.some((c) => c.code === config.rowVar);

  const toggle = (key) => (e) =>
    updateConfig({ type: 'SET_OPTION', key, value: e.target.checked });

  return (
    <>
      <Select
        label={t('crosstabs.rows', 'Rows')}
        value={config.rowVar ?? ''}
        onChange={(value) => updateConfig({ type: 'SET_ROW', value })}
      >
        {rowVars.map((v) => (
          <option key={v.id} value={v.id}>
            {nameOf(v.id, v.label)}
            {v.multi ? ` ${t('crosstabs.multi_tag', '(multi)')}` : ''}
          </option>
        ))}
      </Select>

      <button
        type="button"
        className={styles.link}
        disabled={!canSwap}
        title={canSwap ? undefined : t('crosstabs.swap_unavailable')}
        onClick={() => updateConfig({ type: 'SWAP' })}
      >
        <ArrowUpDown size={15} aria-hidden="true" />
        {t('crosstabs.swap')}
      </button>

      <Select
        label={t('crosstabs.columns', 'Columns (banner)')}
        value={config.colVar ?? ''}
        onChange={(value) => updateConfig({ type: 'SET_COL', value })}
      >
        {colVars.map((v) => (
          <option key={v.code} value={v.code}>
            {nameOf(v.code, v.label)}
          </option>
        ))}
      </Select>

      <Select
        label={t('crosstabs.weight', 'Weight')}
        value={config.weightVar ?? ''}
        onChange={(value) => updateConfig({ type: 'SET_WEIGHT', value })}
      >
        <option value="">{t('crosstabs.weight_none', 'None')}</option>
        {colVars.map((v) => (
          <option key={v.code} value={v.code}>
            {nameOf(v.code, v.label)}
          </option>
        ))}
      </Select>

      {filters}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          {t('crosstabs.show_in_cells')}
        </legend>
        <div className={styles.checks}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={config.options.counts}
              onChange={toggle('counts')}
            />
            {t('crosstabs.counts', 'Counts')}
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={config.options.pct}
              onChange={toggle('pct')}
            />
            {t('crosstabs.column_pct', 'Column %')}
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={config.options.significance}
              onChange={toggle('significance')}
            />
            {t('crosstabs.significance', 'Significance (95%)')}
          </label>
        </div>
      </fieldset>

      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.btn}
          onClick={onExport}
          disabled={!canExport}
        >
          <Download size={16} aria-hidden="true" />
          {t('crosstabs.export_csv', 'Export CSV')}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={onSavePlan}
        >
          {t('crosstabs.save_plan', 'Save tab plan')}
        </button>
      </div>
    </>
  );
}
