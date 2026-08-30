/**
 * Build a CSV string from a CrosstabResultDto (client-side, no extra endpoint).
 * Low-base columns are marked; each cell shows count and column %.
 */

const quote = (s) => `"${String(s).replace(/"/g, '""')}"`;

export function crosstabToCsv(result, rowVarLabel) {
  if (!result) return '';
  const { columns, rows } = result;

  const header = [quote(rowVarLabel ?? ''), ...columns.map((c) => quote(c.label))];
  const lines = [header.join(',')];

  for (const row of rows) {
    const cells = columns.map((col, i) => {
      const cell = row.cells[i];
      if (col.lowBase) return quote(`${cell.count} (low base)`);
      const pct = Math.round(cell.pct * 100);
      const sig = cell.beats?.length ? ` ${cell.beats.join('')}` : '';
      return quote(`${cell.count} (${pct}%)${sig}`);
    });
    lines.push([quote(row.label), ...cells].join(','));
  }

  lines.push([quote('Base'), ...columns.map((c) => quote(c.base))].join(','));
  if (result.weighting) {
    lines.push(
      [quote('Effective base'), ...columns.map((c) => quote(c.effectiveBase))].join(','),
    );
  }
  return lines.join('\n');
}

export function downloadCsv(csv, filename = 'crosstab.csv') {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
