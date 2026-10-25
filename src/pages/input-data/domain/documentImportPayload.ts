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
  // A rejected current factor must not inherit a saved draft's previous result.
  // This changes review state only; persisted historical snapshots remain intact.
  const previous = payload.calculationStatus === 'MISSING_FACTOR' ? {
    ...item, matchedFactorId: null, matchedFactorName: null, matchedFactorSourceYear: null,
    matchedFactorValue: null, matchedFactorUnit: null, matchedFactorVersion: null,
    matchedFactorSourceAuthority: null, matchedFactorSourceDocument: null, matchedFactorSourceUrl: null,
    matchedFactorVerificationStatus: null, matchedFactorConfidenceLevel: null,
    matchedFactorAssumptions: null, factorSelectionReason: null, factorSelectionExplanation: null,
    calculatedEmissionsKgCO2e: null,
  } : item;
  return {
    ...previous,
    status: getCanonicalReviewStatusFromPayload(payload),
    matchingStatus: payload.matchingStatus ?? previous.matchingStatus,
    reportTreatment: payload.reportTreatment ?? previous.reportTreatment,
    scope: payload.scope ?? previous.scope,
    calculationStatus: payload.calculationStatus ?? previous.calculationStatus,
    calculationMessage: payload.calculationMessage ?? previous.calculationMessage,
    matchedFactorId: payload.matchedFactorId ?? previous.matchedFactorId,
    matchedFactorName: payload.matchedFactorName ?? previous.matchedFactorName,
    matchedFactorSourceYear: payload.matchedFactorSourceYear ?? previous.matchedFactorSourceYear,
    matchedFactorValue: payload.matchedFactorValue ?? previous.matchedFactorValue,
    matchedFactorUnit: payload.matchedFactorUnit ?? previous.matchedFactorUnit,
    matchedFactorVersion: payload.matchedFactorVersion ?? previous.matchedFactorVersion,
    matchedFactorSourceAuthority: payload.matchedFactorSourceAuthority ?? previous.matchedFactorSourceAuthority,
    matchedFactorSourceDocument: payload.matchedFactorSourceDocument ?? previous.matchedFactorSourceDocument,
    matchedFactorSourceUrl: payload.matchedFactorSourceUrl ?? previous.matchedFactorSourceUrl,
    matchedFactorVerificationStatus:
      payload.matchedFactorVerificationStatus ?? previous.matchedFactorVerificationStatus,
    matchedFactorConfidenceLevel:
      payload.matchedFactorConfidenceLevel ?? previous.matchedFactorConfidenceLevel,
    matchedFactorAssumptions: payload.matchedFactorAssumptions ?? previous.matchedFactorAssumptions,
    factorSelectionReason: payload.factorSelectionReason ?? previous.factorSelectionReason,
    factorSelectionExplanation: payload.factorSelectionExplanation ?? previous.factorSelectionExplanation,
    calculatedEmissionsKgCO2e: payload.calculatedEmissionsKgCO2e ?? previous.calculatedEmissionsKgCO2e,
  };
}
