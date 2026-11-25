import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import styles from './Crosstabs.module.css';

// Cell shading as the phase-3.3 table draws it: the accent blue, from a
// faint wash on an empty cell to a third opacity on the fullest one.
const HEAT_RGB = [58, 70, 216];
const HEAT_MIN = 0.05;
const HEAT_RANGE = 0.28;

// The shade mixed onto the white card, opaque, with a 1px shadow of itself
// either side: columns sit on fractional pixels, and two translucent cells
// would each half-cover the pixel between them and let a white seam through.
const heatStyle = (alpha) => {
  const color = `rgb(${HEAT_RGB.map((v) => Math.round(255 + (v - 255) * alpha)).join(', ')})`;
  return {
    backgroundColor: color,
    boxShadow: `1px 0 0 ${color}, -1px 0 0 ${color}`,
  };
};

/**
 * Renders a CrosstabResultDto: a dark header band naming the columns (and
 * their significance letters), count/percentage cells shaded by count, and
 * the column bases underneath. Low-base columns show the count alone.
 */
export default function CrosstabTable({ result, options, caption, corner }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const { columns, rows, weighting } = result;
  const showCount = options.counts;
  const showPct = options.pct;
  const showSig = options.significance;

  let maxCount = 0;
  for (const row of rows) {
    row.cells.forEach((cell, i) => {
      if (!columns[i].lowBase && cell.count > maxCount) maxCount = cell.count;
    });
  }
  const heat = (count) =>
    heatStyle(HEAT_MIN + (maxCount > 0 ? (count / maxCount) * HEAT_RANGE : 0));

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        {caption && <caption className={styles.srOnly}>{caption}</caption>}
        <thead>
          <tr>
            <th scope="col">{corner}</th>
            {columns.map((c) => (
              <th key={c.code} scope="col">
                <bdi>{c.label}</bdi>
                <span className={styles.letter}>({c.letter})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code}>
              <th scope="row">
                <bdi>{row.label}</bdi>
              </th>
              {row.cells.map((cell, i) => {
                const col = columns[i];
                if (col.lowBase) {
                  return (
                    <td key={col.code}>
                      <span className={styles.lowBase}>{cell.count}</span>
                    </td>
                  );
                }
                return (
                  <td key={col.code} style={heat(cell.count)}>
                    {/* "7 · 33% AC" reads left to right in either language. */}
                    <bdi dir="ltr">
                      {showCount && cell.count}
                      {showPct && (
                        <span className={styles.pct}>
                          {showCount && ' · '}
                          {Math.round(cell.pct * 100)}%
                        </span>
                      )}
                      {showSig && cell.beats.length > 0 && (
                        <span className={styles.sig}>
                          {cell.beats.join('')}
                        </span>
                      )}
                    </bdi>
                  </td>
                );
              })}
            </tr>
          ))}

          <tr className={styles.baseRow}>
            <th scope="row">{t('crosstabs.base', 'Base')}</th>
            {columns.map((c) => (
              <td key={c.code}>
                {c.base}
                {weighting && (
                  <span className={styles.eff}>
                    {' · '}
                    <bdi>
                      {t('crosstabs.eff', 'eff')} {c.effectiveBase}
                    </bdi>
                  </span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
