import { getSupportedUnitsForActivityType } from '../constants/activityTypes';
import { normalizeUnitForDisplay, normalizeUnitKey } from './unitNormalization';

/** Snapshot formatting only: never converts quantities or establishes eligibility. */
export function formatSavedFactorUnit(
  resultUnit: string | null | undefined,
  inputUnit: string | null | undefined,
  activityType: string,
): string | undefined {
  const result = resultUnit?.trim();
  if (!result) return undefined;
  // Preserve the source's complete denominator, including unsupported compounds.
  if (result.includes('/')) return result;

  // The current calculation contract emits kgCO2e. Do not invent a rate for other numerators.
  if (!/^kgco2(?:e|eq|equivalent)$/.test(result.toLowerCase().replace(/₂/g, '2').replace(/\s/g, ''))) return result;
  if (/[/*()]/.test(inputUnit ?? '')) return result;
  const input = normalizeUnitForDisplay(inputUnit);
  if (input.status !== 'valid') return result;
  const supported = getSupportedUnitsForActivityType(activityType);
  if (!supported.some(unit => normalizeUnitKey(unit) === normalizeUnitKey(input.value))) return result;
  return `${result}/${input.value}`;
}
