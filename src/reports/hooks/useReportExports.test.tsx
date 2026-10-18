import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReportExports } from './useReportExports';
import { buildExecutiveSummaryPdf, buildTechnicalReviewPdf, getReportPdfFileName } from '../pdf';
import { createClientAuditLog } from '../../services/auditLogs';
import { trackActivityEvent } from '../../services/activityEvents';
import { track } from '../../services/analytics.service';
import { goldenReport } from '../pdf/__tests__/goldenFixtures';

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
    const { result } = renderHook(() => useReportExports({ report, hasReportOutput: true, page: '/reports', url: 'https://example.invalid/reports', reportScope: 'dateRange', onWorkflowEventsRefresh: refresh }));
    await act(async () => { await (kind === 'executive' ? result.current.exportExecutivePdf() : result.current.exportTechnicalPdf()); });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const profile = kind === 'executive' ? 'EXECUTIVE_SUMMARY' : 'TECHNICAL_REVIEW';
    expect(builder).toHaveBeenCalledExactlyOnceWith(report);
    expect(getReportPdfFileName).toHaveBeenCalledExactlyOnceWith(profile, report.documentControl, report.outputGeneratedDate);
    expect(save).toHaveBeenCalledExactlyOnceWith('unchanged-profile-filename.pdf');
    expect(createClientAuditLog).toHaveBeenCalledTimes(1);
    expect(createClientAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'EXPORT_PDF', page: '/reports', description: `Exported ${kind === 'executive' ? 'executive summary' : 'technical review package'} for ${report.reportScopeLabel}` }));
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
    const { result } = renderHook(() => useReportExports({ report, hasReportOutput: true, page: '/reports', url: '', reportScope: 'dateRange', onWorkflowEventsRefresh: refresh }));
    await act(async () => result.current.exportTechnicalPdf());
    expect(result.current.exportError).toBe('Technical review package export failed. Please try again.');
    expect(trackActivityEvent).not.toHaveBeenCalled();
    expect(createClientAuditLog).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
