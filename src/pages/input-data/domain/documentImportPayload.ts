import { getCanonicalReviewStatusFromPayload } from './draftRowClassification';
import { type ConversionFactorItem } from '../../../services/conversionFactors';
import { normalizeActivityType as normalizeCanonicalActivityType } from '../../../utils/activityType';
import { resolveActivityYear, type MatchableConversionFactor } from '../../../utils/conversionFactorMatching';
import { getActivitySourceType } from '../../../utils/activitySourceType';
import { evaluateActivityRecord } from '../../../utils/canonicalRecordEvaluation';
import {
  type EditableParsedActivity,
  type DraftActivityInput,
} from '../inputData.types';
import {
  formatDocumentSourceTypeLabel,
  normalizePreviewSiteFacility,
  normalizeOptionalImportCost,
  normalizeOptionalImportString,
} from './extractionNormalization';

export function buildDocumentImportActivityPayload(input: {
  item: EditableParsedActivity;
  documentId: string;
  sourceFileName: string;
  importBatchId: string;
  conversionFactors: ConversionFactorItem[];
  organizationId?: string | null;
}) {
  const { item, documentId, sourceFileName, importBatchId, conversionFactors, organizationId } = input;
  const activityType =
    normalizeCanonicalActivityType(item.activityType.value) ||
    String(item.activityType.value ?? '').trim();
  const country = item.jurisdictionCountry.value || 'Canada';
  const province = item.jurisdictionRegion.value || undefined;
  const quantity = Number(item.quantity.value);
  const activityYear = resolveActivityYear({
    servicePeriodEndDate: item.periodEndDate,
    recordDate: item.recordDate.value,
  });
  const recordYear = activityYear.year;
  const sourceTypeLabel = formatDocumentSourceTypeLabel({ fileName: sourceFileName });
  const facilityName = normalizePreviewSiteFacility(item.facilityName?.value);
  const baseNotes = [`Imported via ${sourceTypeLabel}.`, sourceFileName ? `Source file: ${sourceFileName}.` : '']
    .filter(Boolean)
    .join(' ');
  const basePayload = {
    activityType,
    recordDate: item.recordDate.value || null,
    recordYear: recordYear ?? undefined,
    quantity: item.quantity.value,
    unit: item.unit.value,
    jurisdictionCountry: country,
    jurisdictionRegion: province,
    facility: facilityName || undefined,
    sourceType: getActivitySourceType('DOCUMENT_AI'),
    sourceReference: item.sourceReference.value || undefined,
    documentId,
    sourceDocumentId: documentId,
    sourceFileName,
    sourceSheetName: item.sourceSheetName ?? undefined,
    sourcePage: item.sourcePage ?? undefined,
    sourceRow: item.sourceRow ?? undefined,
    sourceTextSnippet: item.sourceTextSnippet ?? undefined,
    costCad: normalizeOptionalImportCost(item.costCad),
    costCurrency: normalizeOptionalImportString(item.costCurrency),
    importBatchId,
    dateEstimated: item.dateEstimated,
  };

  function withCalculation(calculation: {
    matchingStatus: string;
    reportTreatment: string;
    calculationStatus: string;
    calculationMessage: string;
    matchedFactorId?: string;
    matchedFactorName?: string;
    matchedFactorSourceYear?: number;
    matchedFactorValue?: number;
    matchedFactorUnit?: string;
    matchedFactorVersion?: string;
    matchedFactorSourceAuthority?: string;
    matchedFactorSourceDocument?: string;
    matchedFactorSourceUrl?: string;
    matchedFactorVerificationStatus?: string;
    matchedFactorConfidenceLevel?: string;
    matchedFactorAssumptions?: string;
    factorSelectionReason?: string;
    factorSelectionExplanation?: string;
    calculatedEmissionsKgCO2e?: number;
    scope?: string;
  }) {
    return {
      ...basePayload,
      ...calculation,
      scope: calculation.scope,
      notes: [baseNotes, activityYear.reviewNote, calculation.calculationMessage].filter(Boolean).join(' '),
    };
  }

  const evaluation = evaluateActivityRecord({
    activityType,
    quantity,
    unit: item.unit.value,
    jurisdictionCountry: country,
    jurisdictionRegion: province,
    recordYear,
    organizationId,
    factors: conversionFactors as MatchableConversionFactor[],
  });

  return withCalculation({
    matchingStatus: evaluation.matchingStatus,
    reportTreatment: evaluation.reportTreatment,
    calculationStatus: evaluation.calculationStatus,
    calculationMessage: evaluation.calculationMessage,
    matchedFactorId: evaluation.matchedFactorId,
    matchedFactorName: evaluation.matchedFactorName,
    matchedFactorSourceYear: evaluation.matchedFactorSourceYear,
    ...evaluation.factorSnapshot,
    calculatedEmissionsKgCO2e: evaluation.calculatedEmissionsKgCO2e ?? undefined,
    scope: evaluation.scope,
  });
}

export function applyConfirmReviewPayload(
  item: EditableParsedActivity,
  payload: DraftActivityInput,
): EditableParsedActivity {
  return {
    ...item,
    status: getCanonicalReviewStatusFromPayload(payload),
    matchingStatus: payload.matchingStatus ?? item.matchingStatus,
    reportTreatment: payload.reportTreatment ?? item.reportTreatment,
    scope: payload.scope ?? item.scope,
    calculationStatus: payload.calculationStatus ?? item.calculationStatus,
    calculationMessage: payload.calculationMessage ?? item.calculationMessage,
    matchedFactorId: payload.matchedFactorId ?? item.matchedFactorId,
    matchedFactorName: payload.matchedFactorName ?? item.matchedFactorName,
    matchedFactorSourceYear: payload.matchedFactorSourceYear ?? item.matchedFactorSourceYear,
    matchedFactorValue: payload.matchedFactorValue ?? item.matchedFactorValue,
    matchedFactorUnit: payload.matchedFactorUnit ?? item.matchedFactorUnit,
    matchedFactorVersion: payload.matchedFactorVersion ?? item.matchedFactorVersion,
    matchedFactorSourceAuthority: payload.matchedFactorSourceAuthority ?? item.matchedFactorSourceAuthority,
    matchedFactorSourceDocument: payload.matchedFactorSourceDocument ?? item.matchedFactorSourceDocument,
    matchedFactorSourceUrl: payload.matchedFactorSourceUrl ?? item.matchedFactorSourceUrl,
    matchedFactorVerificationStatus:
      payload.matchedFactorVerificationStatus ?? item.matchedFactorVerificationStatus,
    matchedFactorConfidenceLevel:
      payload.matchedFactorConfidenceLevel ?? item.matchedFactorConfidenceLevel,
    matchedFactorAssumptions: payload.matchedFactorAssumptions ?? item.matchedFactorAssumptions,
    factorSelectionReason: payload.factorSelectionReason ?? item.factorSelectionReason,
    factorSelectionExplanation: payload.factorSelectionExplanation ?? item.factorSelectionExplanation,
    calculatedEmissionsKgCO2e: payload.calculatedEmissionsKgCO2e ?? item.calculatedEmissionsKgCO2e,
  };
}
