import * as ExcelJS from 'exceljs';

/** Export format (minus ODS which was dropped, §7). */
export type ResponseFormat = 'CSV' | 'XLSX';

export function responseFormatFrom(input?: string): ResponseFormat {
  return (input ?? '').toLowerCase() === 'xlsx' ? 'XLSX' : 'CSV';
}

export function exportContentType(format: ResponseFormat): string {
  return format === 'XLSX'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv';
}

/** Cell value coercion for the export (objects → JSON). */
function cell(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return value as string | number | boolean;
}

const csvField = (value: unknown): string => {
  const s = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV with a header row, CRLF line endings (commons-csv DEFAULT format). */
export function exportCsv(rows: unknown[][], colNames: string[]): Buffer {
  const lines = [
    colNames.map(csvField).join(','),
    ...rows.map((row) => row.map(csvField).join(',')),
  ];
  return Buffer.from(lines.join('\r\n'));
}

export async function exportXlsx(
  rows: unknown[][],
  colNames: string[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Responses');
  sheet.addRow(colNames);
  for (const row of rows) {
    sheet.addRow(row.map(cell));
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
