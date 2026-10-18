import { useState } from 'react';
import { buildExecutiveSummaryPdf, buildTechnicalReviewPdf, getReportPdfFileName } from '../pdf';
import { createClientAuditLog } from '../../services/auditLogs';
import { track } from '../../services/analytics.service';
import { trackActivityEvent } from '../../services/activityEvents';
import { buildPilotCsv } from '../../utils/reportCsvExport';
import type { CanonicalReportData } from '../domain/reportTypes';

type ReportExportKind = 'executive' | 'technical' | 'csv';

type UseReportExportsInput = {
  report: CanonicalReportData;
  hasReportOutput: boolean;
  page: string;
  url: string;
  reportScope: string;
  onWorkflowEventsRefresh: () => Promise<void> | void;
};

export function useReportExports({
  report,
  hasReportOutput,
  page,
  url,
  reportScope,
  onWorkflowEventsRefresh,
}: UseReportExportsInput) {
  const [exporting, setExporting] = useState<ReportExportKind | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function exportExecutivePdf() {
    if (!hasReportOutput) return;

    setExporting('executive');
    setExportError(null);
    try {
      buildExecutiveSummaryPdf(report).save(getReportPdfFileName('EXECUTIVE_SUMMARY', report.documentControl, report.outputGeneratedDate));
      recordPdfExport('EXECUTIVE_SUMMARY');
    } catch {
      setExportError('Executive summary export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  }

  async function exportTechnicalPdf() {
    if (!hasReportOutput) return;

    setExporting('technical');
    setExportError(null);
    try {
      buildTechnicalReviewPdf(report).save(getReportPdfFileName('TECHNICAL_REVIEW', report.documentControl, report.outputGeneratedDate));
      recordPdfExport('TECHNICAL_REVIEW');
    } catch {
      setExportError('Technical review package export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  }

  function recordPdfExport(outputProfile: 'EXECUTIVE_SUMMARY' | 'TECHNICAL_REVIEW') {
    const description = outputProfile === 'EXECUTIVE_SUMMARY' ? 'executive summary' : 'technical review package';
    void createClientAuditLog({
      action: 'EXPORT_PDF', entityType: 'Report',
      description: `Exported ${description} for ${report.reportScopeLabel}`, page,
    }).catch(() => { /* PDF export should not be blocked by audit logging. */ });
    void trackActivityEvent({
      eventName: 'REPORT_EXPORTED_PDF', page, url, entityType: 'Report',
      metadata: { reportScope, outputProfile, recordsIncluded: report.reportCountSummary.processedRecords },
    }).catch(() => { /* PDF export should not be blocked by usage tracking. */ });
    void trackActivityEvent({
      eventName: 'PDF_EXPORTED', page, url, entityType: 'REPORT',
      metadata: {
        ...buildWorkflowReportSummary({ report, reportFormat: 'PDF' }),
        ...(outputProfile === 'EXECUTIVE_SUMMARY' ? { outputProfile } : {}),
      },
    }).then(() => onWorkflowEventsRefresh()).catch(() => { /* PDF audit should not block export. */ });
    track('REPORT_PDF_EXPORTED', {
      reportType: 'emissions', outputProfile, reportScope, recordCount: report.reportCountSummary.processedRecords,
    });
  }

  async function exportCsv() {
    if (!hasReportOutput) return;

    setExporting('csv');
    setExportError(null);
    try {
      const csv = buildPilotCsv(report);
      downloadCsvFile(
        csv,
        `CarbonLite_Sample_Report_Export_v0.1_${new Date()
          .toISOString()
          .slice(0, 10)}.csv`,
      );

      void trackActivityEvent({
        eventName: 'REPORT_EXPORTED_CSV',
        page,
        url,
        entityType: 'Report',
        metadata: {
          reportScope,
          recordsIncluded: report.reportCountSummary.processedRecords,
        },
      }).catch(() => {
        // Export should not be blocked by usage tracking.
      });
      void trackActivityEvent({
        eventName: 'CSV_EXPORTED',
        page,
        url,
        entityType: 'REPORT',
        metadata: {
          ...buildWorkflowReportSummary({
            report,
            reportFormat: 'CSV',
          }),
          exportedRecords: report.calculationDetails.length,
          exportedAt: new Date().toISOString(),
          exportStatus: 'EXPORTED',
        },
      })
        .then(() => onWorkflowEventsRefresh())
        .catch(() => {
          // CSV audit should not block export.
        });
    } catch {
      setExportError('CSV export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  }

  return {
    exporting,
    exportError,
    exportExecutivePdf,
    exportTechnicalPdf,
    exportCsv,
  };
}

function downloadCsvFile(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function buildWorkflowReportSummary(input: {
  report: Pick<
    CanonicalReportData,
    | 'reportCountSummary'
    | 'inventory'
    | 'scopeSummary'
    | 'totalEstimatedEmissionsKgCO2e'
    | 'reportPeriod'
    | 'reportScopeLabel'
  >;
  reportFormat: string;
}) {
  const report = input.report;

  return {
    reportName: 'CarbonLite Pilot Emissions Data Readiness Report',
    reportPeriod: report.reportPeriod,
    reportScope: report.reportScopeLabel,
    reportFormat: input.reportFormat,
    totalKgCO2e: report.totalEstimatedEmissionsKgCO2e,
    scope1KgCO2e: report.scopeSummary['Scope 1'],
    scope2KgCO2e: report.scopeSummary['Scope 2'],
    scope3KgCO2e: report.scopeSummary['Scope 3'],
    includedRecords: report.reportCountSummary.processedRecords,
    trackedMetrics: report.inventory.trackedMetricCount,
    recordsRequiringReview: report.inventory.importedNeedsReviewCount,
    reportStatus: 'GENERATED',
    generatedAt: new Date().toISOString(),
  };
}
