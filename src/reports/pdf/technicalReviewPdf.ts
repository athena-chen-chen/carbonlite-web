import { formatSourceEvidenceCounts } from '../domain/reportSemantics';
import type { SpreadsheetReviewRowItem } from '../../services/spreadsheetReviewRows';
import jsPDF from 'jspdf';
import { buildCarbonCreditReadinessAssessment, CARBON_CREDIT_READINESS_DISCLAIMER } from '../../components/MetricsSummarySection';
import {
  FORMAL_REPORT_METHODOLOGY,
  buildSourceEvidenceSummaryRows,
  formatReportJurisdiction,
  formatReportUnit,
  formatReviewReasons,
} from '../../components/FormalReportPreview';
import {
  buildCalculatedFormula,
  formatCalculationStatus,
  formatFactorValue,
  formatRecordSource,
  formatTraceableFactor,
} from '../../utils/calculationTraceability';
import { formatDisplayNumber, formatEmissionsWithUnit } from '../../utils/numberFormatting';
import { formatScopeClassification } from '../../utils/scopeClassification';
import { getActivityTypeLabel, getFactorDisplayName } from '../../utils/activityType';
import {
  formatReportFactorSummaryVerification,
  formatReportFactorUnit,
  formatTraceabilityReviewNote,
  getDisplaySourceLabel,
  getTrackedMetricAction,
  getTrackedMetricMessage,
  isRecordRequiringCorrection,
  isTrackedMetricDetail,
} from '../../utils/reportCredibility';
import { buildFacilityThresholdReferenceRows, FACILITY_THRESHOLD_REFERENCE_DISCLAIMER } from '../../utils/siteFacilityBreakdown';
import { getWorkflowStage } from '../../constants/carbonliteWorkflow';
import { buildReportOutputFacts } from '../export/reportOutputFacts';
import type { CanonicalReportData } from '../domain/reportTypes';
import {
  getPdfUsableWidth,
  getPdfTextWidthFromX,
  getPdfAppendixUsableWidth,
  ensurePdfSpace,
  ensurePdfSectionFits,
  estimatePdfTextBlockHeight,
  drawPdfTextBlock,
  autoTablePdf,
  drawReportPdfCover,
  drawPdfSectionTitle,
  addPdfDocumentControlFooters,
  PDF_MARGIN_MM,
} from './pdfShared';
import {
  getScopeDescription,
  formatOptionalDataCompletenessDetail,
  buildReadinessPdfRows,
  formatSourceReviewFiles,
  formatSourceReviewCount,
  getSourceReviewAppendixEmptyMessage,
  getSourceReviewAppendixIntro,
  getSourceReviewSectionNote,
  formatSourceReviewStatus,
  formatSourceReviewIssue,
  formatSourceReviewIssueType,
  formatReviewRowJurisdiction,
  formatSourceReviewAction,
  formatSourceEvidenceMethod,
  formatSiteFacilityActivityBreakdown,
  formatThresholdTonnes,
  classifyScope,
} from './pdfFormatters';
import {
  drawInventoryBoundaryPdfSection,
  drawRegulatoryReportingReferencePdfSection,
  drawEmissionsHotspotsPdfSection,
  drawFactorDetailsPdfSection,
} from './pdfSections';
import { DEFAULT_REPORT_OPTIONS, formatCarbonCreditReadinessLevel, getCalculationScopeResolution } from '../presentation/reportPresentationFormatters';

export function buildTechnicalReviewPdf(canonicalData: CanonicalReportData): jsPDF {
  // CanonicalReportData is the authoritative report-domain source for export renderers.
  const outputFacts = buildReportOutputFacts(canonicalData);
  const doc = new jsPDF();
  const today = canonicalData.outputGeneratedDate;
  const {
    calculationCoverage,
    coverageCounts,
    documentControl,
    executiveSummary,
    hotspotAnalysis,
    primarySkippedReasons,
    totalsByMetric,
  } = canonicalData;
  const organizationName = canonicalData.organizationName;
  const reportPeriod = canonicalData.reportPeriod;
  const reportScopeLabel = canonicalData.reportScopeLabel;
  const inventoryBoundary = canonicalData.inventoryBoundary;
  const reportCountSummary = canonicalData.reportCountSummary;
  const sourceReviewSummary = canonicalData.sourceReviewSummary;
  const reportingReadinessAssessment = canonicalData.reportingReadinessAssessment;
  const dataReadinessSummary = canonicalData.dataReadinessSummary;
  const totalEstimatedEmissionsKgCO2e = outputFacts.totalKgCO2e;
  const scopeSummary = outputFacts.scopeTotals;
  const siteFacilityBreakdownRows = outputFacts.facilityBreakdown.rows;
  const conversionFactorsUsed = outputFacts.factorReview.factors;
  const calculationDetails = canonicalData.calculationDetails;
  const matchedActivityEmissions = canonicalData.matchedActivityEmissions;
  const sourceEvidenceRows = canonicalData.sourceEvidenceRows;
  const includeCarbonCreditReadinessNotes = DEFAULT_REPORT_OPTIONS.includeCarbonCreditReadinessNotes === true;
  const regulatoryReportingReference = canonicalData.regulatoryReportingReference;
  const facilityThresholdReferenceRows = buildFacilityThresholdReferenceRows(
    siteFacilityBreakdownRows,
    canonicalData.regulatoryReportingReference.thresholdReferences,
  );
  const carbonCreditReadiness = buildCarbonCreditReadinessAssessment(
    calculationDetails,
    dataReadinessSummary,
  );
  doc.setProperties({
    title: `CarbonLite Technical Review Package - ${documentControl.reportId}`,
    subject: `Report ID ${documentControl.reportId}; ${documentControl.reportVersion}; ${documentControl.reviewStatus}`,
    author: 'CarbonLite',
    creator: documentControl.generatedWith,
    keywords: `CarbonLite, technical review package, ${documentControl.reportId}, ${documentControl.reviewStatus}`,
  });
  drawReportPdfCover(doc, {
    organizationName,
    reportPeriod,
    reportScopeLabel,
    generatedDate: today,
    documentControl,
    outputProfile: 'TECHNICAL_REVIEW',
  });

  doc.addPage();
  let nextY = drawInventoryBoundaryPdfSection(doc, inventoryBoundary, 18);

  nextY = ensurePdfSpace(doc, nextY + 4, 48);
  drawPdfSectionTitle(doc, 'Executive Summary', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    head: [['Executive Summary', 'Value']],
    body: [
      ['Estimated Emissions', executiveSummary.estimatedEmissions],
      ['Imported Activity Records', reportCountSummary.totalRecordsFound],
      ['Records Included in GHG Total', executiveSummary.recordsIncluded],
      ['Tracked Metrics', executiveSummary.trackedMetrics],
      ['Imported Activity Records Requiring Review', executiveSummary.recordsRequiringReview],
      ['Unresolved Source Rows Remaining in Input Review', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.needsReviewCount)],
      ['Primary Activity Types', executiveSummary.primaryActivityTypes],
      ['Missing Factor Count', primarySkippedReasons.missingFactor],
      ['Calculation Coverage', executiveSummary.dataQualityCoverage],
    ],
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;
  nextY = drawEmissionsHotspotsPdfSection(doc, hotspotAnalysis, nextY, sourceReviewSummary);

  nextY = ensurePdfSpace(doc, nextY, 52);
  drawPdfSectionTitle(doc, 'Calculation Quality Summary', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    head: [['Quality Measure', 'Value']],
    body: [
      ['Imported Activity Records', reportCountSummary.totalRecordsFound],
      ['Records Included in GHG Total', reportCountSummary.processedRecords],
      ['Tracked Metrics', primarySkippedReasons.trackedOnly],
      ['Imported Activity Records Requiring Review', executiveSummary.recordsRequiringReview],
      ['Unresolved Source Rows Remaining in Input Review', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.needsReviewCount)],
      ['Missing Factors', primarySkippedReasons.missingFactor],
      ['Missing Jurisdiction', primarySkippedReasons.missingJurisdiction],
      ['Invalid Unit', primarySkippedReasons.invalidUnit],
      ['Imported Activity Review Reasons', formatReviewReasons(primarySkippedReasons)],
      [
        'Calculation Coverage',
        calculationCoverage,
      ],
    ],
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;
  drawPdfSectionTitle(doc, 'Source Dataset Review Status', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [['Source Review Measure', 'Value']],
    body: [
      ['Source Files', formatSourceReviewFiles(sourceReviewSummary)],
      ['Reviewable Source Rows', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.totalRows)],
      ['Rows Resolved / Imported', sourceReviewSummary.available ? `${sourceReviewSummary.resolvedCount} of ${sourceReviewSummary.totalRows}` : formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.importedCount ?? 0)],
      ['Emission Rows Eligible for Import', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.readyCount)],
      ['Tracked Operational Rows', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.trackedOnlyCount)],
      ['Source Rows Still Requiring Review', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.needsReviewCount)],
      ['Review Count Distinction', getSourceReviewSectionNote(sourceReviewSummary)],
      ['Source Dataset Resolution', formatSourceReviewStatus(sourceReviewSummary)],
    ],
    styles: { fontSize: 8, cellPadding: 1.8, valign: 'top' },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 122 },
    },
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;
  drawPdfSectionTitle(doc, 'Reporting Readiness Checklist', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [['Item', 'Status', 'Evidence']],
    body: [
      ...buildReadinessPdfRows(reportingReadinessAssessment),
      [
        'Calculation Coverage',
        calculationCoverage,
        `Calculated emission-bearing records divided by eligible emission-bearing records. ${coverageCounts.calculatedRecords} of ${coverageCounts.eligibleEmissionBearingRecords} eligible emission-bearing records were calculated as GHG emissions records; ${primarySkippedReasons.trackedOnly} record${primarySkippedReasons.trackedOnly === 1 ? ' was' : 's were'} tracked as operational ${primarySkippedReasons.trackedOnly === 1 ? 'metric' : 'metrics'} and excluded from the denominator.`,
      ],
      [
        'Optional Data Completeness',
        `${formatDisplayNumber(outputFacts.optionalDataCompletenessPercent)}%`,
        formatOptionalDataCompletenessDetail(dataReadinessSummary),
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.8, valign: 'top' },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 38 },
      2: { cellWidth: 92 },
    },
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;
  if (nextY > 235) {
    doc.addPage();
    nextY = 18;
  }
  drawPdfSectionTitle(doc, 'Emissions Breakdown', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    head: [['Category', 'Metric Type', 'Unit', 'Total']],
    body: totalsByMetric.map((item) => [
      item.category === 'calculated' ? 'Calculated Result' : 'Input Data',
      item.metricType,
      item.unit,
      item.totalValue,
    ]),
  });

  nextY = (doc as any).lastAutoTable.finalY + 14;
  drawPdfSectionTitle(doc, 'Emissions by Scope', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    head: [['Scope', 'Description', 'Calculated Emissions', 'Share of Total']],
    body: [
      ...(['Scope 1', 'Scope 2', 'Scope 3'] as const).map((scope) => {
      const emissions = scopeSummary[scope] ?? 0;
      const share = totalEstimatedEmissionsKgCO2e > 0 ? (emissions / totalEstimatedEmissionsKgCO2e) * 100 : 0;
      return [
        scope,
        getScopeDescription(scope),
        formatEmissionsWithUnit(emissions),
        `${formatDisplayNumber(share)}%`,
      ];
      }),
      ...(scopeSummary.Unclassified > 0
        ? [[
            'Unclassified',
            'Calculated records requiring scope review',
            formatEmissionsWithUnit(scopeSummary.Unclassified),
            `${
              totalEstimatedEmissionsKgCO2e > 0
                ? formatDisplayNumber((scopeSummary.Unclassified / totalEstimatedEmissionsKgCO2e) * 100)
                : '0'
            }%`,
          ]]
        : []),
    ],
  });

  nextY = (doc as any).lastAutoTable.finalY + 14;
  drawPdfSectionTitle(doc, 'Emissions by Site / Facility', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    head: [['Site / Facility', 'Scope 1', 'Scope 2', 'Scope 3', 'Total', 'Included Records', 'Activity Type Breakdown']],
    body: siteFacilityBreakdownRows.length
      ? siteFacilityBreakdownRows.map((row) => [
          row.siteFacility,
          formatEmissionsWithUnit(row.scope1KgCO2e),
          formatEmissionsWithUnit(row.scope2KgCO2e),
          formatEmissionsWithUnit(row.scope3KgCO2e),
          formatEmissionsWithUnit(row.totalKgCO2e),
          row.includedRecords,
          formatSiteFacilityActivityBreakdown(row),
        ])
      : [['No calculated GHG records with site or facility totals.', '', '', '', '', '', '']],
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  });

  if (facilityThresholdReferenceRows.length > 0) {
    nextY = (doc as any).lastAutoTable.finalY + 14;
    const facilityThresholdDescription = [
      'Regulatory threshold screening is not yet configured with reviewed source provenance for this jurisdiction.',
      'Reviewed regulatory source provenance is required before threshold screening.',
      FACILITY_THRESHOLD_REFERENCE_DISCLAIMER,
    ];
    const facilityThresholdTextHeight = estimatePdfTextBlockHeight(
      doc,
      facilityThresholdDescription,
      getPdfUsableWidth(doc),
      4.1,
    );
    nextY = ensurePdfSectionFits(
      doc,
      nextY,
      8 + facilityThresholdTextHeight + 18 + Math.min(facilityThresholdReferenceRows.length, 2) * 12,
    );
    drawPdfSectionTitle(doc, 'Facility-Level Reporting Threshold Reference', nextY);
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
      facilityThresholdDescription,
      PDF_MARGIN_MM,
      nextY + 7,
      { maxWidth: getPdfUsableWidth(doc) },
    );
    autoTablePdf(doc, {
      startY: nextY + 10 + facilityThresholdTextHeight,
      head: [['Site / Facility', 'Jurisdiction', 'Regulatory Reference', 'Threshold', 'Total Calculated Emissions', 'Status', 'Screening Note']],
      body: facilityThresholdReferenceRows.map((row) => [
        row.siteFacility,
        row.jurisdictionLabel,
        row.regulatoryReference,
        row.thresholdLabel,
        `${formatEmissionsWithUnit(row.totalKgCO2e)} (${formatThresholdTonnes(row.totalTCO2e)} t CO₂e)`,
        row.status,
        row.screeningNote,
      ]),
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    });
  }

  const activityStartY = (doc as any).lastAutoTable.finalY + 14;
  drawPdfSectionTitle(doc, 'Activity Breakdown', activityStartY);
  autoTablePdf(doc, {
    startY: activityStartY + 6,
    head: [['Activity Type', 'Quantity', 'Unit', 'Activity Jurisdiction', 'Estimated Emissions', 'Scope', 'Source Reference']],
    body: matchedActivityEmissions.length
      ? matchedActivityEmissions.map((item) => [
          getActivityTypeLabel(item.activityType),
          formatDisplayNumber(item.quantity),
          item.unit,
          formatReportJurisdiction(item.jurisdictionRegion ?? item.jurisdiction, item.jurisdictionCountry),
          formatEmissionsWithUnit(item.estimatedEmissionsKgCO2e),
          classifyScope(item.activityType),
          getDisplaySourceLabel(item),
        ])
      : [['No activity records with matching emission factors.', '', '', '', '', '', '']],
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 115;
  if (nextY > 230) {
    doc.addPage();
    nextY = 18;
  }

  drawPdfSectionTitle(doc, 'Emission Factors Summary', nextY + 10);
  autoTablePdf(doc, {
    startY: nextY + 16,
    head: [[
      'Factor',
      'Value',
      'Unit',
      'Jurisdiction',
      'Source Year',
      'Verification',
      'Used Records',
    ]],
    body: conversionFactorsUsed.length
      ? conversionFactorsUsed.map((factor) => [
          getFactorDisplayName(factor.factorName) || getActivityTypeLabel(factor.activityType) || 'Factor not specified',
          formatFactorValue(factor.factorValue),
          formatReportFactorUnit(factor.resultUnit, factor.inputUnit),
          factor.jurisdiction || 'Not specified',
          factor.factorYear || factor.sourceYear || 'Not specified',
          formatReportFactorSummaryVerification(factor),
          factor.usedRecordsCount ?? 1,
        ])
      : [['No emission factors found for this report scope.', '', '', '', '', '', '']],
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    styles: { fontSize: 7.8, cellPadding: 1.8 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 14 },
      2: { cellWidth: 22 },
      3: { cellWidth: 34 },
      4: { cellWidth: 18 },
      5: { cellWidth: 38 },
      6: { cellWidth: 16 },
    },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  nextY = drawPdfTextBlock(
    doc,
    'Detailed source, version, confidence level, and assumptions are provided in the Factor Details / Assumptions section below.',
    14,
    nextY + 5,
    178,
    4,
  );
  if (conversionFactorsUsed.length > 0) {
    nextY += 10;
    nextY = drawFactorDetailsPdfSection(doc, conversionFactorsUsed, nextY);
  }

  nextY = ensurePdfSpace(doc, nextY, 66);

  drawPdfSectionTitle(doc, 'Calculation Traceability', nextY + 10);
  autoTablePdf(doc, {
    startY: nextY + 16,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [[
      'Activity',
      'Quantity',
      'Factor Used',
      'Calculation',
      'Scope',
      'Status',
      'Review Note',
    ]],
    body: calculationDetails.length
      ? calculationDetails.map((item) => [
          getActivityTypeLabel(item.activityType),
          `${formatDisplayNumber(item.activityQuantity)} ${formatReportUnit(item.activityUnit, item)}`,
          formatTraceableFactor(item),
          buildCalculatedFormula(item),
          formatScopeClassification(getCalculationScopeResolution(item).scope),
          formatCalculationStatus(item.status),
          formatTraceabilityReviewNote(item),
        ])
      : [['No calculation details available.', '', '', '', '', '', '']],
    styles: { fontSize: 7.2, cellPadding: 1.7 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 22 },
      2: { cellWidth: 26 },
      3: { cellWidth: 40 },
      4: { cellWidth: 17 },
      5: { cellWidth: 18 },
      6: { cellWidth: 37 },
    },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  const sourceEvidenceSummaryRows = buildSourceEvidenceSummaryRows(sourceEvidenceRows);
  const sourceEvidenceTrackedCount = sourceEvidenceSummaryRows.reduce(
    (total, item) => total + item.trackedMetrics,
    0,
  );

  drawPdfSectionTitle(doc, 'Source Evidence Summary', nextY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  nextY = drawPdfTextBlock(
    doc,
    `${formatSourceEvidenceCounts(canonicalData.sourceEvidenceCounts)}. This section summarizes the source inputs and entry/import methods used to create the activity records included in this pilot report. Detailed record-level source evidence is provided in the appendix.`,
    14,
    nextY + 18,
    180,
    4.1,
  );

  autoTablePdf(doc, {
    startY: nextY + 4,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [[
      'Source Input',
      'Source Type',
      'Import Method',
      'Record-Level References',
      'Included GHG Records',
      'Tracked Metrics',
      'Imported Review Records',
    ]],
    body: sourceEvidenceSummaryRows.length
      ? sourceEvidenceSummaryRows.map((item) => [
          item.sourceFile,
          item.sourceType,
          item.importMethod,
          item.sourceReference,
          item.includedRecords,
          item.trackedMetrics,
          item.recordsRequiringReview,
        ])
      : [['No source evidence available.', '', '', '', '', '', '']],
    styles: { fontSize: 7.2, cellPadding: 1.7 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 28 },
      2: { cellWidth: 28 },
      3: { cellWidth: 34 },
      4: { cellWidth: 20 },
      5: { cellWidth: 18 },
      6: { cellWidth: 18 },
    },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (sourceEvidenceTrackedCount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    nextY = drawPdfTextBlock(
      doc,
      'Water is tracked as an operational metric and excluded from GHG emissions totals unless a reviewed water emissions factor is provided.',
      14,
      nextY + 5,
      178,
      4,
    );
  }
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  const sourceFiles = Array.from(
    new Set(sourceEvidenceRows.map((item) => item.sourceFile).filter(Boolean)),
  );
  drawPdfSectionTitle(doc, 'Workflow History Summary', nextY + 10);
  autoTablePdf(doc, {
    startY: nextY + 18,
    head: [['Canonical Stage', 'Summary']],
    body: [
      [
        `Stage ${getWorkflowStage('SOURCE_DATA').step}: ${getWorkflowStage('SOURCE_DATA').title}`,
        sourceFiles.length
          ? sourceFiles.join(', ')
          : 'Source evidence requires review. The original file or source reference was not available.',
      ],
      [
        `Stage ${getWorkflowStage('DATA_ISSUES').step}: ${getWorkflowStage('DATA_ISSUES').title}`,
        `${reportCountSummary.processedRecords} emissions records and ${calculationDetails.filter(isTrackedMetricDetail).length} tracked metric were imported; ${formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.needsReviewCount)} unresolved source rows remain in Input Review. ${calculationDetails.filter(isRecordRequiringCorrection).length} imported activity records require review.`,
      ],
      [
        `Stage ${getWorkflowStage('REPORT').step}: ${getWorkflowStage('REPORT').title}`,
        `${formatEmissionsWithUnit(totalEstimatedEmissionsKgCO2e)} total for ${reportPeriod}.`,
      ],
    ],
    styles: { fontSize: 7.2, cellPadding: 1.7 },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 138 },
    },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  doc.setFontSize(14);
  doc.text('Imported Activity Records Requiring Review', 14, nextY + 10);
  const reviewRows = calculationDetails.filter(isRecordRequiringCorrection);
  const trackedMetricRows = calculationDetails.filter(isTrackedMetricDetail);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const reviewNoteY = drawPdfTextBlock(
    doc,
    'Unresolved source rows have not been imported into ActivityData and are not counted as imported activity records requiring review.',
    PDF_MARGIN_MM,
    nextY + 16,
    getPdfAppendixUsableWidth(doc),
    4,
  );
  autoTablePdf(doc, {
    startY: reviewNoteY + 3,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [['Activity', 'Quantity', 'Unit', 'Issue Type', 'Issue Message', 'Source Reference', 'Action']],
    body: reviewRows.length
      ? reviewRows.map((item) => [
          getActivityTypeLabel(item.activityType),
          formatDisplayNumber(item.activityQuantity),
          formatReportUnit(item.activityUnit, item),
          formatCalculationStatus(item.status),
          item.matchingMessage || item.reason || 'Review this record before calculation.',
          formatRecordSource(item),
          item.status === 'MISSING_FACTOR' ? 'Create factor' : 'Fix record',
        ])
      : [['No imported activity records require review for this report scope.', '', '', '', '', '', '']],
    styles: { fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (trackedMetricRows.length) {
    if (nextY > 230) {
      doc.addPage();
      nextY = 20;
    }

    doc.setFontSize(12);
    doc.text('Tracked Metrics', 14, nextY + 10);
    autoTablePdf(doc, {
      startY: nextY + 18,
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      head: [['Activity', 'Quantity', 'Unit', 'Status', 'Message', 'Source Reference', 'Action']],
      body: trackedMetricRows.map((item) => [
        getActivityTypeLabel(item.activityType),
        formatDisplayNumber(item.activityQuantity),
        formatReportUnit(item.activityUnit, item),
        'Tracked Metric',
        getTrackedMetricMessage(item),
        formatRecordSource(item),
        getTrackedMetricAction(),
      ]),
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 23, 42] },
    });
  }

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  nextY = drawRegulatoryReportingReferencePdfSection(doc, nextY + 10, regulatoryReportingReference);
  nextY = ensurePdfSpace(doc, nextY, 42);

  drawPdfSectionTitle(doc, 'Methodology and Limitations', nextY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  nextY += 18;
  FORMAL_REPORT_METHODOLOGY.forEach((paragraph) => {
    nextY = ensurePdfSpace(doc, nextY, 18);
    nextY = drawPdfTextBlock(doc, paragraph, 14, nextY, 180, 4.4) + 5;
  });

  doc.addPage('landscape');
  nextY = 18;
  drawPdfSectionTitle(doc, 'Appendix A: Imported Record-Level Source Evidence', nextY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  nextY = drawPdfTextBlock(
    doc,
    'Detailed record-level source evidence retained for activity records in this report scope. The main report body summarizes this information by source input.',
    PDF_MARGIN_MM,
    nextY + 8,
    getPdfTextWidthFromX(doc, PDF_MARGIN_MM),
    4.1,
  );
  autoTablePdf(doc, {
    startY: nextY + 4,
    margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
    tableWidth: getPdfAppendixUsableWidth(doc),
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [[
      'Activity Type',
      'Quantity',
      'Unit',
      'Date',
      'Source Input',
      'Source / Import Method',
      'Source Reference',
      'Status',
      'Treatment',
      'Review Note',
    ]],
    body: sourceEvidenceRows.length
      ? sourceEvidenceRows.map((item) => [
          getActivityTypeLabel(item.activityType),
          item.quantity,
          item.unit,
          item.recordDate,
          item.sourceFile,
          formatSourceEvidenceMethod(item.sourceType, item.importMethod),
          item.sourceReference,
          item.matchingStatus,
          item.reportTreatment,
          item.notes,
        ])
      : [['No source evidence available.', '', '', '', '', '', '', '', '', '']],
    styles: { fontSize: 7.2, cellPadding: 1.35, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 31 },
      1: { cellWidth: 13 },
      2: { cellWidth: 11 },
      3: { cellWidth: 17 },
      4: { cellWidth: 36 },
      5: { cellWidth: 27 },
      6: { cellWidth: 42 },
      7: { cellWidth: 23 },
      8: { cellWidth: 18 },
      9: { cellWidth: 47 },
    },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (nextY > 165) {
    doc.addPage('landscape');
    nextY = 18;
  } else {
    nextY += 14;
  }

  drawPdfSectionTitle(doc, 'Appendix B: Source Rows Requiring Review', nextY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  nextY = drawPdfTextBlock(
    doc,
    getSourceReviewAppendixIntro(sourceReviewSummary),
    PDF_MARGIN_MM,
    nextY + 8,
    getPdfTextWidthFromX(doc, PDF_MARGIN_MM),
    4.1,
  );
  autoTablePdf(doc, {
    startY: nextY + 4,
    margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
    tableWidth: getPdfAppendixUsableWidth(doc),
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [[
      'Source Reference',
      'Source Row',
      'Activity',
      'Quantity',
      'Unit',
      'Jurisdiction',
      'Issue Type',
      'Issue',
      'Action',
    ]],
    body: sourceReviewSummary.available
      ? sourceReviewSummary.needsReviewRows.length
        ? (sourceReviewSummary.needsReviewRows as SpreadsheetReviewRowItem[]).map((row) => [
            row.sourceReference || row.rowId || 'Source row',
            row.sourceRow ?? '',
            getActivityTypeLabel(row.activityType || row.rawActivityType || 'UNKNOWN'),
            row.quantity ?? row.rawQuantity ?? '',
            formatReportUnit(row.unit || ''),
            formatReviewRowJurisdiction(row),
            formatSourceReviewIssueType(row),
            formatSourceReviewIssue(row),
            formatSourceReviewAction(row),
          ])
        : [['No source rows require review for this report scope.', '', '', '', '', '', '', '', '']]
      : [[getSourceReviewAppendixEmptyMessage(sourceReviewSummary), '', '', '', '', '', '', '', '']],
    styles: { fontSize: 6.4, cellPadding: 1.1, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: [146, 64, 14] },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 13 },
      2: { cellWidth: 23 },
      3: { cellWidth: 12 },
      4: { cellWidth: 9 },
      5: { cellWidth: 22 },
      6: { cellWidth: 23 },
      7: { cellWidth: 84 },
      8: { cellWidth: 52 },
    },
  });

  if (includeCarbonCreditReadinessNotes) {
    doc.addPage('portrait');
    nextY = 20;

    drawPdfSectionTitle(doc, 'Optional Appendix: Carbon Credit Readiness Screening Notes', nextY + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    nextY = drawPdfTextBlock(
      doc,
      'This optional section is an early screening note only. It is not a certification, verification, eligibility determination, or compliance assessment. CarbonLite does not determine carbon credit eligibility, certify emissions reductions, provide third-party verification, or replace professional advice.',
      14,
      nextY + 18,
      180,
      4.3,
    ) + 4;
    autoTablePdf(doc, {
      startY: nextY,
      head: [['Readiness Signal', 'Value']],
      body: [
        ['Readiness Level', formatCarbonCreditReadinessLevel(carbonCreditReadiness.readinessLevel)],
        ['Readiness Score', `${carbonCreditReadiness.score}/100`],
        [
          'Reduction Detected',
          carbonCreditReadiness.reductionAmount !== null && carbonCreditReadiness.reductionPercentage !== null
            ? `${formatEmissionsWithUnit(carbonCreditReadiness.reductionAmount)} (${formatDisplayNumber(carbonCreditReadiness.reductionPercentage)}%)`
            : 'Not assessed or not detected',
        ],
        ['Baseline Data', carbonCreditReadiness.checklist.find((item) => item.key === 'baseline-data')?.status ?? 'Not assessed'],
        ['Records Requiring Review', dataReadinessSummary.recordsRequiringReview],
        ['Tracked Operational Metrics', dataReadinessSummary.trackedOnlyCount],
        ['Disclaimer', CARBON_CREDIT_READINESS_DISCLAIMER],
      ],
      styles: { fontSize: 7.2, cellPadding: 1.7 },
      headStyles: { fillColor: [71, 85, 105] },
      columnStyles: {
        0: { cellWidth: 46 },
        1: { cellWidth: 134 },
      },
    });
  }

  addPdfDocumentControlFooters(doc, documentControl);
  return doc;
}
