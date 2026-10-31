import type { CalculationAuditDetail } from '../../services/metrics';

export const LOCATION_BASED_SCOPE_2_LABEL = 'Scope 2 — Location-based';
export const MARKET_BASED_SCOPE_2_DISCLOSURE = 'Market-based Scope 2 not calculated.';

export type Scope2AccountingDisclosure = {
  accountingMethod: 'LOCATION_BASED' | 'UNSPECIFIED' | 'NOT_APPLICABLE';
  accountingMethodLabel: 'Location-based' | 'Not specified' | 'Not applicable';
  scopeLabel: string;
  marketBasedStatus: 'NOT_CALCULATED';
  marketBasedDisclosure: string;
};

type Scope2Evidence = {
  activityType?: unknown;
  status?: unknown;
  factorName?: unknown;
  factorDisplayName?: unknown;
  factorDefaultScope?: unknown;
  factorScope?: unknown;
  factorNotes?: unknown;
  factorAssumptions?: unknown;
  sourceDocument?: unknown;
};

export function hasLocationBasedScope2Evidence(input: Scope2Evidence) {
  if (String(input.activityType ?? '').trim().toUpperCase() !== 'ELECTRICITY') return false;
  return [
    input.factorName,
    input.factorDisplayName,
    input.factorDefaultScope,
    input.factorScope,
    input.factorNotes,
    input.factorAssumptions,
    input.sourceDocument,
  ].some((value) => /location[\s-]*based/i.test(String(value ?? '')));
}

export function getElectricityAccountingMethodLabel(input: Scope2Evidence) {
  return hasLocationBasedScope2Evidence(input) ? 'Location-based' : 'Not specified';
}

export function buildScope2AccountingDisclosure(
  calculationDetails: CalculationAuditDetail[],
): Scope2AccountingDisclosure {
  const calculatedElectricity = calculationDetails.filter((detail) =>
    detail.activityType === 'ELECTRICITY' && detail.status === 'CALCULATED',
  );
  const accountingMethod = calculatedElectricity.length === 0
    ? 'NOT_APPLICABLE'
    : calculatedElectricity.every(hasLocationBasedScope2Evidence)
    ? 'LOCATION_BASED'
    : 'UNSPECIFIED';

  return {
    accountingMethod,
    accountingMethodLabel: accountingMethod === 'LOCATION_BASED'
      ? 'Location-based'
      : accountingMethod === 'NOT_APPLICABLE'
      ? 'Not applicable'
      : 'Not specified',
    scopeLabel: accountingMethod === 'LOCATION_BASED'
      ? LOCATION_BASED_SCOPE_2_LABEL
      : accountingMethod === 'UNSPECIFIED'
      ? 'Scope 2 — Accounting method not specified'
      : 'Scope 2',
    marketBasedStatus: 'NOT_CALCULATED',
    marketBasedDisclosure: MARKET_BASED_SCOPE_2_DISCLOSURE,
  };
}
