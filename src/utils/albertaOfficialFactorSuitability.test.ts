import { describe, expect, it, vi } from 'vitest';
import { findBestConversionFactorMatch, type MatchableConversionFactor } from './conversionFactorMatching';
import { isInventoryFactorEligible, type EmissionBasis, type FactorApplicability } from './factorGovernance';
import {
  isInventoryFactorEligible as isApiInventoryFactorEligible,
  snapshotFactorProvenance,
} from '../../../carbonlite-api/src/conversion-factors/factor-governance';
import { apiFetch } from '../services/api';
import { getConversionFactors } from '../services/conversionFactors';

vi.mock('../services/api', () => ({ apiFetch: vi.fn() }));

// Test specimens only: no library admission, seed or database connection.
// Source locations and complete component sets are in the Task 8 decision record.
const frozenCorporateFactors: MatchableConversionFactor[] = [
  { id: 'test-approved-electricity', name: 'Test-approved corporate electricity - Alberta', activityType: 'ELECTRICITY', unit: 'kWh', factorValue: 0.53,
    applicability: 'CORPORATE_INVENTORY', sourceAuthority: 'Example inventory agency', sourceDocument: 'Approved corporate factor' },
  { id: 'pilot-gas', name: 'Natural Gas - Canada Generic', activityType: 'NATURAL_GAS', unit: 'GJ', factorValue: 49.44, region: 'Canada (Generic)' },
  { id: 'pilot-gasoline', name: 'Gasoline combustion', activityType: 'GASOLINE', unit: 'L', factorValue: 2.31 },
  { id: 'pilot-diesel', name: 'Diesel combustion', activityType: 'DIESEL', unit: 'L', factorValue: 2.68 },
].map(factor => ({ country: 'Canada', region: 'Alberta', sourceYear: 2025, isSystemDefault: true, resultUnit: 'kgCO2e', ...factor }));

function official(factor: MatchableConversionFactor): MatchableConversionFactor {
  return { country: 'Canada', region: 'Alberta', sourceYear: 2026, isSystemDefault: true,
    status: 'OFFICIAL', verified: true, confidenceLevel: 'OFFICIAL_GOVERNMENT',
    sourceAuthority: 'Alberta Environment and Protected Areas', ...factor };
}

const offsetCandidates = [
  ['renewable', 0.4303],
  ['increased-on-site-grid-use', 0.4588],
  ['reduced-grid-use', 0.4588],
  ['distributed-renewable-point-of-use', 0.4588],
].map(([context, value]) => official({ id: `offset-${context}`, name: `2026 EGDF ${context}`,
  activityType: 'ELECTRICITY', unit: 'MWh', resultUnit: 'tCO2e', factorValue: Number(value),
  applicability: 'ALBERTA_OFFSET_PROJECT', emissionBasis: 'DIRECT_CO2E',
  sourceDocument: 'Carbon Offset Emission Factors Handbook',
  methodologyProvenance: { sourceVersion: '3.2', sourceTable: 'Table 1', factorYear: 2026, methodologyMethod: String(context) },
}));

const componentCandidates = [
  { id: 'handbook-natural-gas', activityType: 'NATURAL_GAS', unit: 'm3', factorValue: 1962, resultUnit: 'g CO2', applicability: 'ALBERTA_OFFSET_PROJECT' },
  { id: 'aqm-natural-gas-ch4', activityType: 'NATURAL_GAS', unit: 'GJ', factorValue: 9.8e-7, resultUnit: 't CH4', emissionBasis: 'CH4_COMPONENT', applicability: 'ALBERTA_TIER_SGRR' },
  { id: 'handbook-gasoline', activityType: 'GASOLINE', unit: 'L', factorValue: 2307, resultUnit: 'g CO2', applicability: 'ALBERTA_OFFSET_PROJECT' },
  { id: 'aqm-gasoline', activityType: 'GASOLINE', unit: 'kL', factorValue: 2.307, resultUnit: 't CO2', applicability: 'ALBERTA_TIER_SGRR' },
  { id: 'aqm-gasoline-alberta', activityType: 'GASOLINE', unit: 'kL', factorValue: 2.174, resultUnit: 't CO2', applicability: 'ALBERTA_TIER_SGRR' },
  { id: 'handbook-diesel', activityType: 'DIESEL', unit: 'L', factorValue: 2681, resultUnit: 'g CO2', applicability: 'ALBERTA_OFFSET_PROJECT' },
  { id: 'aqm-diesel', activityType: 'DIESEL', unit: 'kL', factorValue: 2.681, resultUnit: 't CO2', applicability: 'ALBERTA_TIER_SGRR' },
  { id: 'aqm-diesel-alberta', activityType: 'DIESEL', unit: 'kL', factorValue: 2.610, resultUnit: 't CO2', applicability: 'ALBERTA_TIER_SGRR' },
].map(factor => official({ name: factor.id, emissionBasis: 'CO2_COMPONENT', ...factor } as MatchableConversionFactor));

const scenarios = [
  { activityType: 'ELECTRICITY', quantity: 1000, inputUnit: 'kWh', factorId: 'test-approved-electricity', total: 530 },
  { activityType: 'NATURAL_GAS', quantity: 3, inputUnit: 'GJ', factorId: 'pilot-gas', total: 148.32 },
  { activityType: 'GASOLINE', quantity: 100, inputUnit: 'L', factorId: 'pilot-gasoline', total: 231 },
  { activityType: 'DIESEL', quantity: 100, inputUnit: 'L', factorId: 'pilot-diesel', total: 268 },
];

const match = (scenario: typeof scenarios[number], factors: MatchableConversionFactor[]) => findBestConversionFactorMatch({
  ...scenario, recordYear: 2026, jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', factors,
});

describe('Task 8 official Alberta suitability boundaries', () => {
  it.each(scenarios)('preserves corporate $activityType at $total kgCO2e with all official candidates present', scenario => {
    const factors = [...offsetCandidates, ...componentCandidates, ...frozenCorporateFactors];
    const before = JSON.stringify(factors);
    const result = match(scenario, factors);
    expect(result?.factor.id).toBe(scenario.factorId);
    expect(result?.conversion).toBeUndefined();
    expect(scenario.quantity * Number(result?.factor.factorValue)).toBeCloseTo(scenario.total, 8);
    expect(JSON.stringify(factors)).toBe(before);
  });

  it.each(offsetCandidates)('excludes $name in native and SI-equivalent units, including nested governed versions', candidate => {
    for (const version of [candidate, { ...candidate, unit: 'kWh', inputUnit: 'kWh', resultUnit: 'kgCO2e' }]) {
      const governed = { id: `${candidate.id}-definition`, name: candidate.name,
        activityType: 'ELECTRICITY', currentActiveVersion: version };
      expect(isInventoryFactorEligible(version)).toBe(false);
      expect(isApiInventoryFactorEligible(version)).toBe(false);
      for (const shape of [version, governed]) {
        expect(match(scenarios[0], [shape])).toBeUndefined();
        expect(match(scenarios[0], [shape, ...frozenCorporateFactors])?.factor.id).toBe('test-approved-electricity');
      }
    }
  });

  it('does not silently fall back among the pilot estimate, EGDF, or ECCC reference values', () => {
    const unsupportedPilot = {
      ...frozenCorporateFactors[0], id: 'factor-electricity-ab', name: 'Electricity - Alberta pilot',
      factorSet: 'PILOT_DEFAULT_V0_1', applicability: undefined,
      sourceAuthority: 'CarbonLite', sourceDocument: 'CarbonLite MVP Default Factors v1.0',
    };
    const ecccReferences = [0.49, 0.438].map((factorValue, index) => official({
      id: `eccc-electricity-ab-${2025 + index}`, name: `ECCC Alberta reference ${factorValue}`,
      activityType: 'ELECTRICITY', unit: 'kWh', resultUnit: 'kgCO2e', factorValue,
      applicability: 'REFERENCE_ONLY', sourceAuthority: 'Environment and Climate Change Canada',
    }));

    expect(match(scenarios[0], [unsupportedPilot, ...offsetCandidates, ...ecccReferences])).toBeUndefined();
  });

  it.each(scenarios)('resolves same-unit, same-jurisdiction $activityType applicability collisions before ranking', scenario => {
    const baseline = frozenCorporateFactors.find(factor => factor.id === scenario.factorId)!;
    const candidates = (['ALBERTA_OFFSET_PROJECT', 'ALBERTA_TIER_SGRR', 'REFERENCE_ONLY'] as FactorApplicability[])
      .map(applicability => official({ ...baseline, id: applicability, factorValue: 999,
        applicability, emissionBasis: 'DIRECT_CO2E', sourceYear: 2026, region: 'Alberta' }));
    const corporate = { ...baseline, applicability: 'CORPORATE_INVENTORY' as const };
    expect(match(scenario, candidates)).toBeUndefined();
    for (const factors of [[...candidates, corporate], [corporate, ...candidates]]) {
      expect(match(scenario, factors)?.factor.id).toBe(baseline.id);
    }
  });

  it.each(componentCandidates)('rejects published $id components even if relabeled corporate/direct-unit text', candidate => {
    expect(isInventoryFactorEligible(candidate)).toBe(false);
    expect(isApiInventoryFactorEligible(candidate)).toBe(false);
    const scenario = scenarios.find(input => input.activityType === candidate.activityType)!;
    // A unit-label error must not override explicit component metadata.
    const mislabeled = { ...candidate, unit: scenario.inputUnit, resultUnit: 'kgCO2e', applicability: 'CORPORATE_INVENTORY' as const };
    expect(match(scenario, [mislabeled])).toBeUndefined();
    expect(match(scenario, [mislabeled, ...frozenCorporateFactors])?.factor.id).toBe(scenario.factorId);
  });

  it.each(['CO2_COMPONENT', 'CH4_COMPONENT', 'N2O_COMPONENT'] as EmissionBasis[])('does not treat GWP references as a component engine: %s', emissionBasis => {
    const candidate = official({ ...frozenCorporateFactors[3], id: emissionBasis,
      applicability: 'CORPORATE_INVENTORY', emissionBasis, resultUnit: 'kgCO2e',
      methodologyProvenance: { gwpSource: 'Test reference only', gwpVersion: 'Test version' } });
    for (const eligible of [isInventoryFactorEligible, isApiInventoryFactorEligible]) expect(eligible(candidate)).toBe(false);
    expect(match(scenarios[3], [candidate])).toBeUndefined();
    expect(match(scenarios[3], [{ ...candidate, id: 'governed', currentActiveVersion: candidate }])).toBeUndefined();
  });

  it('retains the ECCC GJ value as reference-only and introduces no universal GJ/m3 conversion', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    const response = await getConversionFactors({ activityType: 'NATURAL_GAS' });
    const result = match(scenarios[1], [...componentCandidates, ...response.items]);
    expect(response.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Natural Gas - Canada Generic', factorValue: 49.44, applicability: 'REFERENCE_ONLY' }),
    ]));
    expect(result).toBeUndefined();
    expect(match({ ...scenarios[1], inputUnit: 'm3', quantity: 100 }, [...componentCandidates, ...response.items])).toBeUndefined();
  });

  it('does not infer the required natural-gas sector or equipment from an energy quantity', () => {
    const candidate = official({ ...frozenCorporateFactors[1], id: 'needs-sector',
      applicability: 'CORPORATE_INVENTORY', emissionBasis: 'DIRECT_CO2E',
      methodologyProvenance: { quantityBasis: 'ENERGY_HHV', sectorApplicability: ['Commercial/Institutional'], methodologyMethod: 'Method 1-2' } });
    expect(match(scenarios[1], [candidate])).toBeUndefined();
  });

  it('retains the captured historical source, method and factor identity after later source edits', () => {
    const current = { id: 'historical-version', factorId: 'historical-factor', version: 'revision-1',
      applicability: 'ALBERTA_OFFSET_PROJECT', emissionBasis: 'DIRECT_CO2E', factorYear: 2026,
      source: { sourceAuthority: 'Alberta Environment and Protected Areas', sourceDocument: 'Carbon Offset Emission Factors Handbook', sourceVersion: '3.2', sourceYear: 2025 },
      methodologyProvenance: { methodologyMethod: 'Grid Displacement', sectorApplicability: ['Original context'] },
    };
    const snapshot = snapshotFactorProvenance(current);
    const before = JSON.stringify(snapshot);
    current.source.sourceVersion = 'future-edition';
    current.methodologyProvenance.sectorApplicability.push('Later context');
    current.version = 'revision-2';
    match(scenarios[0], [...offsetCandidates, ...frozenCorporateFactors]);
    expect(JSON.stringify(snapshot)).toBe(before);
    expect(snapshot).toMatchObject({ factorId: 'historical-factor', factorVersionId: 'historical-version', factorVersion: 'revision-1', sourceVersion: '3.2', factorYear: 2026 });
  });
});
