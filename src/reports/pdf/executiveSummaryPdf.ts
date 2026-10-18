import jsPDF from 'jspdf';
import { formatDisplayNumber, formatEmissionsWithUnit } from '../../utils/numberFormatting';
import { formatReadinessStatus } from '../../utils/reportingReadiness';
import { buildReportOutputFacts } from '../export/reportOutputFacts';
import type { CanonicalReportData } from '../domain/reportTypes';
import {
  ensurePdfSpace,
  estimatePdfTextBlockHeight,
  drawPdfTextBlock,
  estimatePdfTableSectionHeight,
  autoTablePdf,
  drawReportPdfCover,
  drawPdfSectionTitle,
  addPdfDocumentControlFooters,
  EXECUTIVE_SECTION_GAP_MM,
  EXECUTIVE_SECTION_TITLE_TO_TABLE_MM,
} from './pdfShared';
import {
  buildExecutiveLimitationsSentence,
  getPilotStageFactorCount,
  getReadinessItemStatus,
  formatExecutiveSourceReviewStatus,
  buildExecutiveKeyPriorities,
} from './pdfFormatters';

export function buildExecutiveSummaryPdf(canonicalData: CanonicalReportData): jsPDF {
  // CanonicalReportData is the authoritative report-domain source for export renderers.
  const outputFacts = buildReportOutputFacts(canonicalData);
  const doc = new jsPDF();
  const {
    calculationCoverage,
    coverageCounts,
    documentControl,
    executiveSummary,
    hotspotAnalysis,
    outputGeneratedDate,
    primarySkippedReasons,
    scopeSummary: pdfScopeSummary,
    sourceReviewSummary: pdfSourceReviewSummary,
  } = canonicalData;
  const organizationName = canonicalData.organizationName;
  const reportPeriod = canonicalData.reportPeriod;
  const reportScopeLabel = canonicalData.reportScopeLabel;
  const reportCountSummary = canonicalData.reportCountSummary;
  const reportingReadinessAssessment = canonicalData.reportingReadinessAssessment;
  const conversionFactorsUsed = outputFacts.factorReview.factors;
  const factorReviewCount = outputFacts.factorReview.factorsRequiringReviewCount;
  const pilotStageFactorCount = getPilotStageFactorCount(conversionFactorsUsed);
  const keyPriorities = buildExecutiveKeyPriorities({
    factorReviewCount,
    pilotStageFactorCount,
    sourceReviewSummary: pdfSourceReviewSummary,
    readinessAssessment: reportingReadinessAssessment,
    documentControl,
  });

  doc.setProperties({
    title: `CarbonLite Executive Summary - ${documentControl.reportId}`,
    subject: `Report ID ${documentControl.reportId}; ${documentControl.reportVersion}; ${documentControl.reviewStatus}`,
    author: 'CarbonLite',
    creator: documentControl.generatedWith,
    keywords: `CarbonLite, executive summary, ${documentControl.reportId}, ${documentControl.reviewStatus}`,
  });
  drawReportPdfCover(doc, {
    organizationName,
    reportPeriod,
    reportScopeLabel,
    generatedDate: outputGeneratedDate,
    documentControl,
    outputProfile: 'EXECUTIVE_SUMMARY',
  });

  doc.addPage();
  let nextY = 18;
  drawPdfSectionTitle(doc, 'Executive Snapshot', nextY);
  autoTablePdf(doc, {
    startY: nextY + EXECUTIVE_SECTION_TITLE_TO_TABLE_MM,
    head: [['Measure', 'Value']],
    body: [
      ['Estimated Emissions', executiveSummary.estimatedEmissions],
      ['Scope 1', formatEmissionsWithUnit(pdfScopeSummary['Scope 1'])],
      ['Scope 2', formatEmissionsWithUnit(pdfScopeSummary['Scope 2'])],
      ['Scope 3', formatEmissionsWithUnit(pdfScopeSummary['Scope 3'])],
      ['Imported Activity Records', reportCountSummary.totalRecordsFound],
      ['Records Included in GHG Total', reportCountSummary.processedRecords],
      [
        'Calculation Coverage',
        `${calculationCoverage} (${coverageCounts.calculatedRecords} of ${coverageCounts.eligibleEmissionBearingRecords} eligible emissions records calculated)`,
      ],
      ['Tracked Metrics', primarySkippedReasons.trackedOnly],
      [pdfSourceReviewSummary.availability === 'STRUCTURED_REVIEW_AVAILABLE' ? 'Structured Source Review' : 'Source Review', formatExecutiveSourceReviewStatus(pdfSourceReviewSummary)],
      [
        'Factor Review',
        `${factorReviewCount} of ${conversionFactorsUsed.length} unique emission ${conversionFactorsUsed.length === 1 ? 'factor' : 'factors'} require review before formal reporting.`,
      ],
      ['Boundary', formatReadinessStatus(getReadinessItemStatus(reportingReadinessAssessment, 'boundary'))],
      ['Reviewer', documentControl.reviewStatus],
    ],
    styles: { fontSize: 8.1, cellPadding: 1.25, valign: 'top' },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 118 },
    },
  });

  nextY = ((doc as any).lastAutoTable?.finalY ?? nextY) + EXECUTIVE_SECTION_GAP_MM;
  nextY = ensurePdfSpace(
    doc,
    nextY,
    estimatePdfTableSectionHeight(Math.max(1, hotspotAnalysis.categoryHotspots.slice(0, 5).length), 6.4),
  );
  drawPdfSectionTitle(doc, 'Emissions Overview', nextY);
  const contributorRows = hotspotAnalysis.categoryHotspots.slice(0, 5).map((row) => [
    row.displayName,
    formatEmissionsWithUnit(row.emissions),
    `${formatDisplayNumber(row.percentageOfTotal)}%`,
  ]);
  autoTablePdf(doc, {
    startY: nextY + EXECUTIVE_SECTION_TITLE_TO_TABLE_MM,
    head: [['Top Estimated Contributors', 'Estimated Emissions', 'Share']],
    body: contributorRows.length
      ? contributorRows
      : [['No calculated emissions contributors available.', '', '']],
    styles: { fontSize: 7.8, cellPadding: 1.05, valign: 'top' },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 76 },
      1: { cellWidth: 56 },
      2: { cellWidth: 36 },
    },
  });

  nextY = ((doc as any).lastAutoTable?.finalY ?? nextY) + EXECUTIVE_SECTION_GAP_MM;
  nextY = ensurePdfSpace(
    doc,
    nextY,
    estimatePdfTableSectionHeight(reportingReadinessAssessment.items.length, 7.2),
  );
  drawPdfSectionTitle(doc, 'Reporting Readiness', nextY);
  autoTablePdf(doc, {
    startY: nextY + EXECUTIVE_SECTION_TITLE_TO_TABLE_MM,
    head: [['Checklist Item', 'Status', 'Evidence']],
    body: reportingReadinessAssessment.items.map((item) => [
      item.label,
      formatReadinessStatus(item.status),
      item.evidence,
    ]),
    styles: { fontSize: 6.9, cellPadding: 0.85, valign: 'top' },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 30 },
      2: { cellWidth: 102 },
    },
  });

  nextY = ((doc as any).lastAutoTable?.finalY ?? nextY) + EXECUTIVE_SECTION_GAP_MM;
  nextY = ensurePdfSpace(
    doc,
    nextY,
    estimatePdfTableSectionHeight(Math.max(1, keyPriorities.length), 6.6),
  );
  drawPdfSectionTitle(doc, 'Key Review Priorities', nextY);
  autoTablePdf(doc, {
    startY: nextY + EXECUTIVE_SECTION_TITLE_TO_TABLE_MM,
    head: [['Priority', 'Action']],
    body: keyPriorities.map((priority, index) => [index + 1, priority]),
    styles: { fontSize: 7.4, cellPadding: 0.95, valign: 'top' },
    headStyles: { fillColor: [146, 64, 14] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 158 },
    },
  });

  nextY = ((doc as any).lastAutoTable?.finalY ?? nextY) + EXECUTIVE_SECTION_GAP_MM;
  const limitationsText = buildExecutiveLimitationsSentence({
    factorReviewCount,
    sourceReviewSummary: pdfSourceReviewSummary,
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const limitationsHeight = estimatePdfTextBlockHeight(doc, limitationsText, 180, 3.8);
  nextY = ensurePdfSpace(doc, nextY, 7 + 5 + limitationsHeight);
  drawPdfSectionTitle(doc, 'Limitations', nextY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  drawPdfTextBlock(
    doc,
    limitationsText,
    14,
    nextY + 7,
    180,
    3.8,
  );

  addPdfDocumentControlFooters(doc, documentControl);
  return doc;
}
