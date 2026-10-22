export type CsvCellKind = 'text' | 'number';

export function neutralizeSpreadsheetText(text: string) {
  // Prevent spreadsheet software from executing user-controlled text as a formula.
  const formulaPrefix = /^[\s\u0000-\u001f]*[=+\-@＝＋－＠]/u;
  const controlPrefix = /^[\s\u0000-\u001f]*[\t\r\n]/u;
  return formulaPrefix.test(text) || controlPrefix.test(text) ? `'${text}` : text;
}

function escapeCsvSyntax(text: string, forceQuotes = false) {
  return forceQuotes || /[",\n\r]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

export function escapeCsvValue(value: unknown, kind: CsvCellKind = 'text') {
  const text = value === null || value === undefined ? '' : String(value);
  // Schema-declared numeric strings include existing grouped display values. Validate
  // them before bypassing text protection; never infer numeric semantics for text fields.
  const numericText = /^[+-]?(?:(?:\d{1,3}(?:[.,\u00a0\u202f ]\d{3})+|\d+)(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i;
  if (typeof value === 'number' || (kind === 'number' && numericText.test(text))) {
    return escapeCsvSyntax(text);
  }
  const safeText = neutralizeSpreadsheetText(text);
  return escapeCsvSyntax(safeText, safeText !== text);
}
