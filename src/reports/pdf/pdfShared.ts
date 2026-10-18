import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPdfText } from '../../utils/numberFormatting';
import type { ReportDocumentControlMetadata } from '../domain/reportTypes';

export const PDF_MARGIN_MM = 14;
export const LANDSCAPE_A4_WIDTH_MM = 297;
export const PDF_APPENDIX_USABLE_WIDTH_MM = LANDSCAPE_A4_WIDTH_MM - PDF_MARGIN_MM * 2;
export const PDF_APPENDIX_INNER_BUFFER_MM = 4;
export const PDF_APPENDIX_TABLE_WIDTH_MM = PDF_APPENDIX_USABLE_WIDTH_MM - PDF_APPENDIX_INNER_BUFFER_MM;
export const PDF_FOOTER_RESERVE_MM = 21;
export const PDF_TOP_MARGIN_MM = 18;
export const EXECUTIVE_SECTION_GAP_MM = 4;
export const EXECUTIVE_SECTION_TITLE_TO_TABLE_MM = 5;
export const FACTOR_DETAIL_TEXT_WIDTH_MM = 178;
export const FACTOR_DETAIL_LINE_HEIGHT_MM = 4.1;
export const FACTOR_DETAIL_BLOCK_SPACING_MM = 5;
export const REPORT_OUTPUT_PROFILE_LABELS: Record<ReportOutputProfile, string> = {
  EXECUTIVE_SUMMARY: 'Executive Summary',
  TECHNICAL_REVIEW: 'Technical Review Package',
};
export type ReportOutputProfile = 'EXECUTIVE_SUMMARY' | 'TECHNICAL_REVIEW';

export function getPdfPageWidth(doc: jsPDF) {
  return doc.internal.pageSize.getWidth();
}

export function getPdfPageHeight(doc: jsPDF) {
  return doc.internal.pageSize.getHeight();
}

export function getPdfUsableWidth(doc: jsPDF, leftMargin = PDF_MARGIN_MM, rightMargin = PDF_MARGIN_MM) {
  return getPdfPageWidth(doc) - leftMargin - rightMargin;
}

export function getPdfTextWidthFromX(doc: jsPDF, x: number, rightMargin = PDF_MARGIN_MM) {
  return Math.max(10, getPdfPageWidth(doc) - x - rightMargin);
}

export function getPdfAppendixUsableWidth(doc: jsPDF) {
  return PDF_APPENDIX_TABLE_WIDTH_MM;
}

export function getPdfBottomY(doc: jsPDF) {
  return getPdfPageHeight(doc) - PDF_FOOTER_RESERVE_MM;
}

export function ensurePdfSpace(doc: jsPDF, y: number, requiredHeight = 50) {
  if (y + requiredHeight <= getPdfBottomY(doc)) return y;
  doc.addPage();
  return PDF_TOP_MARGIN_MM;
}

export function ensurePdfSectionFits(doc: jsPDF, y: number, requiredHeight = 50) {
  return ensurePdfSpace(doc, y, requiredHeight);
}

export function ensurePdfSpaceWithContinuation(
  doc: jsPDF,
  y: number,
  requiredHeight: number,
  continuationTitle?: string,
) {
  if (y + requiredHeight <= getPdfBottomY(doc)) return y;
  doc.addPage();
  if (!continuationTitle) return PDF_TOP_MARGIN_MM;

  drawPdfSectionTitle(doc, continuationTitle, PDF_TOP_MARGIN_MM);
  return PDF_TOP_MARGIN_MM + 8;
}

export function estimatePdfTextBlockHeight(
  doc: jsPDF,
  text: string | string[],
  maxWidth: number,
  lineHeight = 4.5,
) {
  const lines = Array.isArray(text)
    ? text.flatMap((line) => doc.splitTextToSize(formatPdfText(line), maxWidth))
    : doc.splitTextToSize(formatPdfText(text), maxWidth);
  return lines.length * lineHeight;
}

export function drawPdfTextBlock(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth = 182,
  lineHeight = 4.5,
) {
  const lines = doc.splitTextToSize(formatPdfText(text), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function estimatePdfTableSectionHeight(rowCount: number, rowHeight: number, titleGap = EXECUTIVE_SECTION_TITLE_TO_TABLE_MM) {
  const headingHeight = 7;
  const tableHeaderHeight = rowHeight;
  return headingHeight + titleGap + tableHeaderHeight + rowCount * rowHeight;
}

export function formatPdfTableValue(value: unknown): unknown {
  if (typeof value === 'string' || typeof value === 'number') {
    return formatPdfText(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatPdfTableValue);
  }

  return value;
}

export function autoTablePdf(doc: jsPDF, options: Parameters<typeof autoTable>[1]) {
  autoTable(doc, {
    ...options,
    margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM, ...(options.margin as object) },
    head: formatPdfTableValue(options.head) as typeof options.head,
    body: formatPdfTableValue(options.body) as typeof options.body,
    foot: formatPdfTableValue(options.foot) as typeof options.foot,
  });
}

export function drawReportPdfCover(
  doc: jsPDF,
  input: {
    organizationName: string;
    reportPeriod: string;
    reportScopeLabel: string;
    generatedDate: string;
    documentControl: ReportDocumentControlMetadata;
    outputProfile: ReportOutputProfile;
  },
) {
  const x = 24;
  const y = 24;

  doc.setFillColor(6, 78, 59);
  doc.roundedRect(x, y, 14, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('CL', x + 3.6, y + 9);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.text('CarbonLite', x + 19, y + 6);

  doc.setFontSize(9);
  doc.setTextColor(4, 120, 87);
  doc.text(REPORT_OUTPUT_PROFILE_LABELS[input.outputProfile], x + 19, y + 12);

  doc.setDrawColor(203, 213, 225);
  doc.line(x, y + 28, 186, y + 28);

  doc.setFontSize(25);
  doc.setTextColor(15, 23, 42);
  doc.text(`CarbonLite ${REPORT_OUTPUT_PROFILE_LABELS[input.outputProfile]}`, x, y + 62, { maxWidth: 166 });

  doc.setFontSize(16);
  doc.setTextColor(4, 120, 87);
  doc.text(input.organizationName || 'Workspace', x, y + 78);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('Report Information', x, y + 100);
  autoTablePdf(doc, {
    startY: y + 104,
    margin: { left: x, right: 24 },
    head: [],
    body: [
      ['Report ID', input.documentControl.reportId],
      ['Report Version', input.documentControl.reportVersion],
      ['Report Status', input.documentControl.reportStatus],
      ['Output Profile', REPORT_OUTPUT_PROFILE_LABELS[input.outputProfile]],
      ['Reporting Period', input.reportPeriod],
      ['Report Scope', input.reportScopeLabel],
      ['Generated Date', input.generatedDate],
      ['Prepared By', 'CarbonLite'],
      ['Reviewer', input.documentControl.reviewer],
      ['Review Status', input.documentControl.reviewStatus],
      ['Generated With', input.documentControl.generatedWith],
    ],
    styles: { fontSize: 8.5, cellPadding: 1.5, valign: 'top' },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { cellWidth: 120 },
    },
  });

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rightMargin = 24;
  drawPdfTextBlock(
    doc,
    'Prepared for review as part of a pilot emissions data readiness and reporting workflow. This draft export is not approved, verified, certified, or assured.',
    x,
    pageHeight - 31,
    pageWidth - x - rightMargin,
    4.2,
  );
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
}

export function drawPdfSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, y);
  doc.setDrawColor(16, 185, 129);
  doc.line(14, y + 2, 52, y + 2);
}

export function addPdfDocumentControlFooters(doc: jsPDF, metadata: ReportDocumentControlMetadata) {
  const pageCount = doc.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(formatPdfDocumentControlFooter(metadata, pageNumber, pageCount), pageWidth - 14, pageHeight - 7, {
      align: 'right',
    });
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
}

export function formatPdfDocumentControlFooter(
  metadata: Pick<ReportDocumentControlMetadata, 'reportId' | 'reportVersion'>,
  pageNumber: number,
  pageCount: number,
) {
  return `CarbonLite | Report ID ${metadata.reportId} | Version ${metadata.reportVersion} | Page ${pageNumber} of ${pageCount}`;
}

export function getReportPdfFileName(
  profile: ReportOutputProfile,
  documentControl: ReportDocumentControlMetadata,
  dateText: string,
) {
  const reportId = documentControl.reportId.toLowerCase();
  const version = documentControl.reportVersion.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const profileSlug =
    profile === 'EXECUTIVE_SUMMARY'
      ? 'executive-summary'
      : 'technical-review-package';

  return `carbonlite-${profileSlug}-${dateText}-${reportId}-${version}.pdf`;
}
