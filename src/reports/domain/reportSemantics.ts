export function buildReportingPeriodLabel(period: {
  startDate: string | null;
  endDate: string | null;
  label: string;
}) {
  const validDate = (value: string | null): value is string => Boolean(
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
  );
  return validDate(period.startDate) && validDate(period.endDate) && period.startDate <= period.endDate
    ? `${period.startDate} to ${period.endDate}`
    : period.label;
}

export type SourceEvidenceCounts = {
  sourceInputCount: number;
  sourceFileCount: number;
  manualEntryCount: number;
};

// Count imported activity origins only; detected/unimported review rows are separate evidence.
export function buildSourceEvidenceCounts(rows: Array<{
  activityDataId?: string;
  rawSourceType?: string | null;
  sourceType?: string | null;
  sourceDocumentId?: string | null;
  sourceFileName?: string | null;
  sourceFile?: string;
}>): SourceEvidenceCounts {
  const inputs = new Set<string>();
  const files = new Set<string>();
  const manual = new Set<string>();
  rows.forEach((row, index) => {
    const type = String(row.rawSourceType ?? row.sourceType ?? '').trim().toUpperCase();
    const recordKey = row.activityDataId || String(index);
    if (['MANUAL', 'MANUAL ENTRY'].includes(type)) {
      manual.add(recordKey);
      inputs.add(`manual:${recordKey}`);
      return;
    }
    const uploaded = /DOCUMENT|PDF|SPREADSHEET|CSV|EXCEL|XLS|IMPORT|UPLOAD|OCR|AI_EXTRACTION/.test(type);
    const fileName = row.sourceFileName ?? row.sourceFile;
    const identity = row.sourceDocumentId || (fileName && !/unavailable|required/i.test(fileName) ? fileName : null);
    if (uploaded && identity) {
      files.add(identity);
      inputs.add(`file:${identity}`);
    } else {
      inputs.add(`record:${recordKey}`);
    }
  });
  return { sourceInputCount: inputs.size, sourceFileCount: files.size, manualEntryCount: manual.size };
}

export function formatSourceEvidenceCounts(counts: SourceEvidenceCounts) {
  const count = (value: number, label: string) => `${value} ${label}${value === 1 ? '' : 's'}`;
  return `${count(counts.sourceInputCount, 'source input')} · ${count(counts.sourceFileCount, 'uploaded file')} · ${counts.manualEntryCount} manual ${counts.manualEntryCount === 1 ? 'entry' : 'entries'}`;
}
