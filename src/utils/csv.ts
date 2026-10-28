/**
 * Dependency-free export helpers used by every list in the console.
 * All of them write a UTF-8 BOM so Excel opens Arabic and Chinese text
 * correctly instead of turning it into mojibake.
 */

const cellText = (value: string | number | null | undefined) =>
  value === null || value === undefined ? '' : String(value);

const csvEscape = (value: string | number | null | undefined) => {
  const text = cellText(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const saveBlob = (filename: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Plain CSV download. */
export function downloadCsv(
  filename: string,
  rows: (string | number | null | undefined)[][],
): void {
  const body = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  saveBlob(filename, new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8;' }));
}

/**
 * Excel copy of the same rows. Written as an HTML table with the Excel mime
 * type so the file opens as a real sheet with columns instead of one long
 * comma-separated column.
 */
export function downloadExcel(
  filename: string,
  rows: (string | number | null | undefined)[][],
): void {
  const escapeHtml = (value: string | number | null | undefined) =>
    cellText(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');

  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">' +
    '<head><meta charset="utf-8" /><style>' +
    'td{mso-number-format:"\\@";border:0.5pt solid #999999;padding:4px;font-family:Arial;font-size:11pt}' +
    'tr:first-child td{font-weight:bold}' +
    `</style></head><body><table>${body}</table></body></html>`;

  saveBlob(filename, new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' }));
}

/** Tab separated — exactly what a spreadsheet expects when pasting. */
export function rowsToClipboardText(
  rows: (string | number | null | undefined)[][],
): string {
  return rows
    .map((row) => row.map((value) => cellText(value).replace(/[\t\r\n]+/g, ' ')).join('\t'))
    .join('\n');
}

/** Copy the rows on screen so they paste straight into Excel or Sheets. */
export async function copyRows(
  rows: (string | number | null | undefined)[][],
): Promise<void> {
  const text = rowsToClipboardText(rows);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', 'true');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
}

/** Safe file-name fragment: keeps letters, numbers and dashes only. */
export function fileSlug(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'export';
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}