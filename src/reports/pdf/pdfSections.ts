import { getDisplayFactorProvenanceLines } from '../../utils/factorProvenanceDisplay';
import jsPDF from 'jspdf';
import { formatHotspotExclusionNote, type HotspotAnalysis } from '../../components/MetricsSummarySection';
import { type FormalConversionFactorUsed } from '../../components/FormalReportPreview';
import { formatFactorValue } from '../../utils/calculationTraceability';
import { formatDisplayNumber, formatEmissionsWithUnit, formatPdfEmissionsWithUnit } from '../../utils/numberFormatting';
import { getActivityTypeLabel, getFactorDisplayName } from '../../utils/activityType';
import { formatCredibilityLabel } from '../../utils/factorCredibility';
import {
  formatReportAssumptions,
  formatReportFactorSource,
  formatReportFactorUnit,
  formatReportVerification,
} from '../../utils/reportCredibility';
import { CARBONLITE_CALCULATION_COVERAGE_LABEL, getInventoryBoundaryStatus, type InventoryBoundary } from '../../constants/inventoryBoundary';
import type { RegulatoryReportingReference, SourceReviewSummary } from '../domain/reportTypes';
import {
  ensurePdfSpace,
  ensurePdfSpaceWithContinuation,
  estimatePdfTextBlockHeight,
  drawPdfTextBlock,
  autoTablePdf,
  drawPdfSectionTitle,
  PDF_MARGIN_MM,
  FACTOR_DETAIL_TEXT_WIDTH_MM,
  FACTOR_DETAIL_LINE_HEIGHT_MM,
  FACTOR_DETAIL_BLOCK_SPACING_MM,
} from './pdfShared';
import {
  formatHotspotLevelForPdf,
  formatExcludedReasonForPdf,
  formatBoundaryValue,
  formatBoundaryReviewStatus,
  formatBoundaryReviewedAt,
} from './pdfFormatters';
import { formatRegulatoryThresholdReference, REGULATORY_REPORTING_REFERENCE_TITLE, REGULATORY_REPORTING_REFERENCE_TEXT } from '../presentation/reportPresentationFormatters';

export function drawInventoryBoundaryPdfSection(
  doc: jsPDF,
  boundary: InventoryBoundary,
  startY: number,
) {
  const boundaryStatus = getInventoryBoundaryStatus(boundary);
  drawPdfSectionTitle(doc, 'Reporting Boundary', startY);
  autoTablePdf(doc, {
    startY: startY + 6,
    head: [['Boundary Field', 'Description']],
    body: [
      ['Configured reporting boundary', boundaryStatus],
      ['Boundary review status', formatBoundaryReviewStatus(boundary)],
      ['Boundary version', `v${boundary.boundaryVersion ?? 1}`],
      ['Boundary reviewed by', boundary.boundaryReviewedBy || 'Not assigned'],
      ['Boundary reviewed at', formatBoundaryReviewedAt(boundary.boundaryReviewedAt)],
      ['Organization / Workspace', formatBoundaryValue(boundary.organizationWorkspace)],
      ...(boundary.industry ? [['Industry', boundary.industry]] : []),
      ...(boundary.country ? [['Country', boundary.country]] : []),
      ...(boundary.provinceOrTerritory ? [['Province / Territory', boundary.provinceOrTerritory]] : []),
      ...(boundary.city ? [['City', boundary.city]] : []),
      ['Reporting period', formatBoundaryValue(boundary.reportingPeriod)],
      ['Geographic boundary', formatBoundaryValue(boundary.geographicBoundary)],
      ['Included facilities or locations', formatBoundaryValue(boundary.includedFacilitiesOrLocations)],
      ['Excluded facilities or locations', formatBoundaryValue(boundary.excludedFacilitiesOrLocations)],
      ['Included scopes', formatBoundaryValue(boundary.includedScopes)],
      ['Scope 3 coverage note', formatBoundaryValue(boundary.scope3CoverageNote)],
      ['Exclusions / limitations', formatBoundaryValue(boundary.exclusionsLimitations)],
      ['Boundary notes', formatBoundaryValue(boundary.boundaryNotes)],
      ['CarbonLite calculation coverage', CARBONLITE_CALCULATION_COVERAGE_LABEL],
      [
        'Coverage note',
        "This describes the activity categories CarbonLite currently calculates. It does not replace the organization's configured reporting boundary.",
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.8, valign: 'top' },
    headStyles: { fillColor: [4, 120, 87] },
    columnStyles: {
      0: { cellWidth: 54 },
      1: { cellWidth: 126 },
    },
  });

  return ((doc as any).lastAutoTable?.finalY ?? startY) + 8;
}

export function drawRegulatoryReportingReferencePdfSection(
  doc: jsPDF,
  startY: number,
  regulatoryReportingReference: RegulatoryReportingReference,
) {
  const y = ensurePdfSpace(doc, startY, 58);
  const body = [
    ['Purpose', REGULATORY_REPORTING_REFERENCE_TEXT],
    [
      'Current regulatory/reporting references',
      regulatoryReportingReference.currentSystems.join('\n'),
    ],
    ...(regulatoryReportingReference.historicalNotes.length
      ? [[
          'Historical / period-specific reference',
          regulatoryReportingReference.historicalNotes.join('\n'),
        ]]
      : []),
    [
      'Regulatory threshold provenance',
      regulatoryReportingReference.thresholdReferences.length
        ? regulatoryReportingReference.thresholdReferences
            .map(formatRegulatoryThresholdReference)
            .join('\n')
        : 'Regulatory threshold screening is not yet configured with reviewed source provenance for this jurisdiction.',
    ],
    [
      'Important note',
      'Reference only. CarbonLite does not determine regulatory obligations. Consult a qualified professional before making regulatory filing or compliance decisions.',
    ],
  ];

  drawPdfSectionTitle(doc, REGULATORY_REPORTING_REFERENCE_TITLE, y);
  autoTablePdf(doc, {
    startY: y + 6,
    head: [['Reference Note', 'Details']],
    body,
    styles: { fontSize: 8, cellPadding: 1.8, valign: 'top' },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 54 },
      1: { cellWidth: 126 },
    },
  });

  return ((doc as any).lastAutoTable?.finalY ?? y) + 8;
}

export function drawEmissionsHotspotsPdfSection(
  doc: jsPDF,
  analysis: HotspotAnalysis,
  startY: number,
  sourceReviewSummary?: SourceReviewSummary | null,
) {
  let y = ensurePdfSpace(doc, startY, 92);
  drawPdfSectionTitle(doc, 'Emissions Hotspots', y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  y = drawPdfTextBlock(
    doc,
    'This section highlights the activity categories contributing the largest share of current estimated emissions. Hotspot analysis helps identify where the organization may want to focus first for factor validation, data quality improvement, and, where estimates are confirmed, reduction planning.',
    14,
    y + 7,
  ) + 2;
  y = drawPdfTextBlock(
    doc,
    'Hotspot analysis only includes records that were successfully calculated. Records requiring review, tracked-only metrics, missing factors, invalid units, or missing jurisdiction are excluded from hotspot totals and listed separately.',
    14,
    y,
  ) + 4;

  if (analysis.totalRecordCount <= 0) {
    y = ensurePdfSpace(doc, y, 20);
    doc.setTextColor(100, 116, 139);
    drawPdfTextBlock(
      doc,
      'Emissions hotspots are not available because no activity records were found.',
      14,
      y,
    );
    return y + 10;
  }

  if (!analysis.categoryHotspots.length || analysis.totalCalculatedEmissions <= 0) {
    y = ensurePdfSpace(doc, y, 24);
    doc.setTextColor(100, 116, 139);
    y = drawPdfTextBlock(
      doc,
      'Emissions hotspots are not available yet because no records could be calculated. Resolve calculation issues before using hotspot analysis.',
      14,
      y,
    ) + 4;
  } else {
    const top = analysis.categoryHotspots[0];
    const second = analysis.categoryHotspots[1];

    y = ensurePdfSpace(doc, y, 38);
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, y, 182, 32, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 95, 70);
    doc.text(`Top Emissions Hotspot: ${top.displayName}`, 18, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    y = drawPdfTextBlock(
      doc,
      top.focusMessage,
      18,
      y + 15,
      170,
      4.2,
    ) + 10;

    if (second) {
      y = ensurePdfSpace(doc, y, 12);
      doc.setTextColor(71, 85, 105);
      y = drawPdfTextBlock(
        doc,
        `${top.displayName} and ${second.displayName} together represent ${formatDisplayNumber(top.percentageOfTotal + second.percentageOfTotal)}% of calculated emissions.`,
        14,
        y,
      ) + 3;
    }

    y = ensurePdfSpace(doc, y, 22 + analysis.categoryHotspots.slice(0, 5).length * 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Top Emission Categories', 14, y);
    y += 8;

    analysis.categoryHotspots.slice(0, 5).forEach((row) => {
      y = ensurePdfSpace(doc, y, 12);
      const barWidth = Math.max(3, Math.min(86, row.percentageOfTotal * 0.86));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(row.displayName, 14, y);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(60, y - 4, 88, 5, 1.5, 1.5, 'F');
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(60, y - 4, barWidth, 5, 1.5, 1.5, 'F');
      doc.setTextColor(15, 23, 42);
      doc.text(`${formatDisplayNumber(row.percentageOfTotal)}%`, 152, y);
      doc.text(formatPdfEmissionsWithUnit(row.emissions), 169, y);
      y += 10;
    });

    y += 2;
    y = ensurePdfSpace(doc, y, 42);
    autoTablePdf(doc, {
      startY: y,
      head: [['#', 'Category', 'Calculated Emissions', 'Share', 'Records', 'Hotspot Level', 'Confidence / Readiness', 'Focus Message']],
      body: analysis.categoryHotspots.map((row) => [
        row.rank,
        row.displayName,
        formatEmissionsWithUnit(row.emissions),
        `${formatDisplayNumber(row.percentageOfTotal)}%`,
        row.calculatedRecordCount,
        formatHotspotLevelForPdf(row.hotspotLevel),
        `${row.estimateConfidence}\n${row.decisionReadiness}`,
        row.focusMessage,
      ]),
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 24 },
        3: { cellWidth: 13 },
        4: { cellWidth: 12 },
        5: { cellWidth: 16 },
        6: { cellWidth: 36 },
        7: { cellWidth: 50 },
      },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 10;
  }

  if (analysis.focusRecommendations.length > 0) {
    y = ensurePdfSpace(doc, y, 34);
    autoTablePdf(doc, {
      startY: y,
      head: [['What to focus on first', 'Recommendation']],
      body: analysis.focusRecommendations.map((item) => [
        `${formatHotspotLevelForPdf(item.priority)} priority: ${item.title}`,
        item.message,
      ]),
      styles: { fontSize: 7, cellPadding: 1.6 },
      headStyles: { fillColor: [4, 120, 87] },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 130 },
      },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 10;
  }

  if (analysis.excludedRecordCount > 0) {
    y = ensurePdfSpace(doc, y, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    y = drawPdfTextBlock(
      doc,
      formatHotspotExclusionNote({ ...analysis, sourceReviewSummary }),
      14,
      y,
    ) + 3;
    const hasOnlyTrackedMetrics = analysis.excludedCategories.length > 0 &&
      analysis.excludedCategories.every((item) => item.reason === 'TRACKED_ONLY');
    autoTablePdf(doc, {
      startY: y,
      head: [hasOnlyTrackedMetrics
        ? ['Operational Metric', 'Treatment', 'Records']
        : ['Category', 'Treatment / Review Reason', 'Records']],
      body: analysis.excludedCategories.length
        ? analysis.excludedCategories.map((item) => [
            item.displayName,
            formatExcludedReasonForPdf(item.reason),
            item.excludedRecordCount,
          ])
        : [['Records requiring review', 'Needs review', analysis.excludedRecordCount]],
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [146, 64, 14] },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 8;
  }

  return y;
}

export function drawFactorDetailsPdfSection(
  doc: jsPDF,
  factors: FormalConversionFactorUsed[],
  startY: number,
) {
  const firstBlockHeight = factors[0] ? estimateFactorDetailBlockHeight(doc, factors[0]) : 0;
  let nextY = ensurePdfSpace(doc, startY, 8 + firstBlockHeight);

  drawPdfSectionTitle(doc, 'Factor Details / Assumptions', nextY);
  nextY += 8;

  factors.forEach((factor) => {
    const blockHeight = estimateFactorDetailBlockHeight(doc, factor);
    nextY = ensurePdfSpaceWithContinuation(
      doc,
      nextY,
      blockHeight,
      'Factor Details / Assumptions (continued)',
    );
    nextY = drawFactorDetailBlock(doc, factor, nextY);
  });

  return nextY;
}

export function buildFactorDetailText(factor: FormalConversionFactorUsed) {
  const factorName =
    getFactorDisplayName(factor.factorName) ||
    getActivityTypeLabel(factor.activityType) ||
    'Factor not specified';

  return [
    `Factor: ${factorName}`,
    `Value: ${formatFactorValue(factor.factorValue)} ${formatReportFactorUnit(factor.resultUnit, factor.inputUnit)}`,
    `Source: ${formatReportFactorSource(factor)}`,
    ...getDisplayFactorProvenanceLines(factor),
    `Verification: ${formatReportVerification(factor)}`,
    `Confidence: ${formatCredibilityLabel(factor.confidenceLevel) || 'Not specified'}`,
    `Assumption: ${formatReportAssumptions(factor)}`,
  ].join('\n');
}

export function estimateFactorDetailBlockHeight(doc: jsPDF, factor: FormalConversionFactorUsed) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  return (
    estimatePdfTextBlockHeight(
      doc,
      buildFactorDetailText(factor),
      FACTOR_DETAIL_TEXT_WIDTH_MM,
      FACTOR_DETAIL_LINE_HEIGHT_MM,
    ) + FACTOR_DETAIL_BLOCK_SPACING_MM
  );
}

export function drawFactorDetailBlock(doc: jsPDF, factor: FormalConversionFactorUsed, y: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  return (
    drawPdfTextBlock(
      doc,
      buildFactorDetailText(factor),
      PDF_MARGIN_MM,
      y,
      FACTOR_DETAIL_TEXT_WIDTH_MM,
      FACTOR_DETAIL_LINE_HEIGHT_MM,
    ) + FACTOR_DETAIL_BLOCK_SPACING_MM
  );
}
