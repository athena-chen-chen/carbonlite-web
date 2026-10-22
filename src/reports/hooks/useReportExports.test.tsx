import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReportExports } from './useReportExports';
import { buildExecutiveSummaryPdf, buildTechnicalReviewPdf, getReportPdfFileName } from '../pdf';
import { createClientAuditLog } from '../../services/auditLogs';
import { trackActivityEvent } from '../../services/activityEvents';
import { track } from '../../services/analytics.service';
import { buildPilotCsv } from '../../utils/reportCsvExport';
import { goldenReport } from '../pdf/__tests__/goldenFixtures';

vi.mock('../../utils/reportCsvExport', async (original) => {
  const actual = await original<typeof import('../../utils/reportCsvExport')>();
  return { ...actual, buildPilotCsv: vi.fn(actual.buildPilotCsv) };
});
vi.mock('../pdf', () => ({ buildExecutiveSummaryPdf: vi.fn(), buildTechnicalReviewPdf: vi.fn(), getReportPdfFileName: vi.fn() }));
vi.mock('../../services/auditLogs', () => ({ createClientAuditLog: vi.fn() }));
vi.mock('../../services/activityEvents', () => ({ trackActivityEvent: vi.fn() }));
vi.mock('../../services/analytics.service', () => ({ track: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClientAuditLog).mockResolvedValue({} as any);
  vi.mocked(trackActivityEvent).mockResolvedValue({} as any);
  vi.mocked(getReportPdfFileName).mockReturnValue('unchanged-profile-filename.pdf');
});

describe('PDF export orchestration', () => {
  it.each(['executive', 'technical'] as const)('saves and emits the existing event set exactly once: %s', async (kind) => {
    const { report } = goldenReport('field');
    const save = vi.fn();
    const builder = kind === 'executive' ? buildExecutiveSummaryPdf : buildTechnicalReviewPdf;
    vi.mocked(builder).mockReturnValue({ save } as any);
    const refresh = vi.fn(async () => undefined);
    const { result } = renderHook(() => useReportExports({ report, hasReportOutput: true, isExportReady: true, page: '/reports', url: 'https://example.invalid/reports', reportScope: 'dateRange', onWorkflowEventsRefresh: refresh }));
    await act(async () => { await (kind === 'executive' ? result.current.exportExecutivePdf() : result.current.exportTechnicalPdf()); });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const profile = kind === 'executive' ? 'EXECUTIVE_SUMMARY' : 'TECHNICAL_REVIEW';
    expect(builder).toHaveBeenCalledExactlyOnceWith(report);
    expect(getReportPdfFileName).toHaveBeenCalledExactlyOnceWith(profile, report.documentControl, report.outputGeneratedDate);
    expect(save).toHaveBeenCalledExactlyOnceWith('unchanged-profile-filename.pdf');
    expect(createClientAuditLog).toHaveBeenCalledTimes(1);
    expect(createClientAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'EXPORT_PDF', page: '/reports', description: `Exported ${kind === 'executive' ? 'executive summary' : 'technical emissions report'} for ${report.reportScopeLabel}` }));
    expect(trackActivityEvent).toHaveBeenCalledTimes(2);
    expect(vi.mocked(trackActivityEvent).mock.calls.map(([event]) => event.eventName)).toEqual(['REPORT_EXPORTED_PDF', 'PDF_EXPORTED']);
    expect(vi.mocked(trackActivityEvent).mock.calls[0][0].metadata).toEqual({ reportScope: 'dateRange', outputProfile: profile, recordsIncluded: 5 });
    const legacy = vi.mocked(trackActivityEvent).mock.calls[1][0].metadata!;
    expect(legacy).toMatchObject({ totalKgCO2e: 2428.44, reportFormat: 'PDF', includedRecords: 5 });
    if (kind === 'executive') expect(legacy.outputProfile).toBe(profile);
    else expect(legacy).not.toHaveProperty('outputProfile');
    expect(track).toHaveBeenCalledExactlyOnceWith('REPORT_PDF_EXPORTED', { reportType: 'emissions', outputProfile: profile, reportScope: 'dateRange', recordCount: 5 });
    expect(result.current.exportError).toBeNull();
  });

  it('does not record a successful export when rendering fails', async () => {
    const { report } = goldenReport('field');
    vi.mocked(buildTechnicalReviewPdf).mockImplementation(() => { throw new Error('Render failed'); });
    const refresh = vi.fn();
    const { result } = renderHook(() => useReportExports({ report, hasReportOutput: true, isExportReady: true, page: '/reports', url: '', reportScope: 'dateRange', onWorkflowEventsRefresh: refresh }));
    await act(async () => result.current.exportTechnicalPdf());
    expect(result.current.exportError).toBe('Technical emissions report export failed. Please try again.');
    expect(trackActivityEvent).not.toHaveBeenCalled();
    expect(createClientAuditLog).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});


it('guards direct invocation of both PDF handlers and CSV when current data is not ready', async () => {
  const { report } = goldenReport('field');
  const { result, rerender } = renderHook(({ isExportReady }) => useReportExports({
    report, hasReportOutput: true, isExportReady, page: '/reports', url: '', reportScope: 'dateRange', onWorkflowEventsRefresh: vi.fn(),
  }), { initialProps: { isExportReady: true } });
  rerender({ isExportReady: false });
  const blob = vi.spyOn(globalThis, 'Blob');
  await act(async () => {
    await result.current.exportExecutivePdf();
    await result.current.exportTechnicalPdf();
    await result.current.exportCsv();
  });
  expect(buildExecutiveSummaryPdf).not.toHaveBeenCalled();
  expect(buildTechnicalReviewPdf).not.toHaveBeenCalled();
  expect(blob).not.toHaveBeenCalled();
  expect(buildPilotCsv).not.toHaveBeenCalled();
  expect(trackActivityEvent).not.toHaveBeenCalled();
  expect(createClientAuditLog).not.toHaveBeenCalled();
  blob.mockRestore();
});

it('exports the same successful B payload and its scope/date metadata to every format', async () => {
  const { report: a } = goldenReport('field');
  const b = {
    ...a, reportPeriod: '2026-04-01 to 2026-06-30', reportScopeLabel: 'Selected Documents (2)',
    calculationDetails: a.calculationDetails.map((detail) => ({ ...detail, recordDate: '2026-04-10', sourceFileName: 'scope-B.csv' })),
    reportingPeriod: { startDate: '2026-04-01', endDate: '2026-06-30', label: '2026-04-01 to 2026-06-30' },
  };
  vi.mocked(buildExecutiveSummaryPdf).mockReturnValue({ save: vi.fn() } as any);
  vi.mocked(buildTechnicalReviewPdf).mockReturnValue({ save: vi.fn() } as any);
  const { result, rerender } = renderHook(({ report, isExportReady }) => useReportExports({
    report, isExportReady, hasReportOutput: true, page: '/reports', url: '', reportScope: 'selectedDocuments', onWorkflowEventsRefresh: vi.fn(),
  }), { initialProps: { report: a, isExportReady: true } });
  rerender({ report: b, isExportReady: false });
  await act(async () => result.current.exportCsv());
  expect(buildPilotCsv).not.toHaveBeenCalled();
  rerender({ report: b, isExportReady: true });
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:report');
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  try {
    await act(async () => {
      await result.current.exportExecutivePdf();
      await result.current.exportTechnicalPdf();
      await result.current.exportCsv();
    });
    expect(buildExecutiveSummaryPdf).toHaveBeenCalledExactlyOnceWith(b);
    expect(buildTechnicalReviewPdf).toHaveBeenCalledExactlyOnceWith(b);
    expect(buildPilotCsv).toHaveBeenCalledExactlyOnceWith(b);
    const csv = vi.mocked(buildPilotCsv).mock.results[0].value;
    expect(csv).toContain('2026-04-10');
    expect(csv).toContain('scope-B.csv');
    expect(csv).not.toContain('2026-01-31');
    expect(vi.mocked(buildTechnicalReviewPdf).mock.calls[0][0].reportPeriod).toBe('2026-04-01 to 2026-06-30');
    expect(vi.mocked(buildTechnicalReviewPdf).mock.calls[0][0].reportScopeLabel).toBe('Selected Documents (2)');
  } finally {
    vi.unstubAllGlobals();
  }
});
