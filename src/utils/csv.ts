/**
 * Tiny dependency-free CSV writer. Adds a UTF-8 BOM so Excel opens Arabic and
 * Chinese text correctly instead of turning it into mojibake.
 */
export function downloadCsv(
  filename: string,
  rows: (string | number | null | undefined)[][],
): void {
  const escape = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const body = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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