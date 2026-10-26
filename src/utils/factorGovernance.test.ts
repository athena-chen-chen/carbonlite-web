import { describe, it, expect } from 'vitest';
import { isInventoryFactorEligible, factorProvenanceLines, type FactorProvenanceSnapshot } from './factorGovernance';
import { findBestConversionFactorMatch } from './conversionFactorMatching';
import { buildFactorDetailText } from '../reports/pdf/pdfSections';
import { buildPilotCsvRows } from './reportCsvExport';

const inventory = { id: 'inventory', name: 'Electricity - Alberta', activityType: 'ELECTRICITY', unit: 'kWh', factorValue: .53, resultUnit: 'kgCO2e', region: 'Alberta', country: 'Canada', sourceYear: 2026, isSystemDefault: true };
const provenance: FactorProvenanceSnapshot = {
  sourceAuthority: 'Alberta Environment and Protected Areas', sourceDocument: 'Carbon Offset Emission Factors Handbook', sourceVersion: '3.2', sourceYear: 2025, publishedDate: '2025-08-20', factorYear: 2026,
  applicability: 'ALBERTA_OFFSET_PROJECT', emissionBasis: 'DIRECT_CO2E', methodologyProvenance: { methodologyDocument: 'Alberta Greenhouse Gas Quantification Methodologies', methodologyVersion: '2.3', methodologyMethod: 'Method 1-1', methodologyLevel: 'Level 1 / 2', quantityBasis: 'ENERGY_HHV', gwpSource: 'Reference', gwpVersion: 'AR5' },
};
const match = (factors: Parameters<typeof findBestConversionFactorMatch>[0]['factors'], inputUnit = 'kWh') => findBestConversionFactorMatch({ activityType: 'ELECTRICITY', inputUnit, quantity: 980, jurisdictionRegion: 'Alberta', jurisdictionCountry: 'Canada', recordYear: 2026, factors });

describe('inventory eligibility', () => {
  it('fails closed for known reference-only methods and unsafe result dimensions', () => {
    expect(isInventoryFactorEligible({ id: 'eccc-natural-gas-canada-generic-gj-2025', resultUnit: 'kgCO2e' })).toBe(false);
    expect(isInventoryFactorEligible({ resultUnit: 'kgCO2e', methodologyProvenance: { sourceVersion: 'ECCC_REFERENCE_2026' } })).toBe(false);
    expect(isInventoryFactorEligible({ inputUnit: 'L', resultUnit: 'g CO2/L' })).toBe(false);
    expect(isInventoryFactorEligible({ inputUnit: 'kWh', resultUnit: 'kgCO2e/GJ' })).toBe(false);
    expect(isInventoryFactorEligible({ inputUnit: 'litres', resultUnit: 'kgCO2e/L' })).toBe(true);
  });
  it.each([undefined, null, 'CORPORATE_INVENTORY'] as const)('keeps legacy/inventory eligibility %s', applicability => {
    expect(match([{ ...inventory, applicability }])?.factor.id).toBe('inventory');
  });
  it.each(['ALBERTA_OFFSET_PROJECT', 'ALBERTA_TIER_SGRR', 'REFERENCE_ONLY'] as const)('excludes %s in every ranking position', applicability => {
    expect(match([{ ...inventory, id: 'restricted', applicability }, inventory])?.factor.id).toBe('inventory');
    expect(match([{ ...inventory, applicability }])).toBeUndefined();
    expect(match([{ ...inventory, currentActiveVersion: { applicability } }])).toBeUndefined();
  });
  it('rejects convertible newer offset EGDF without changing 980 x .53', () => {
    const result = match([{ ...inventory, id: 'egdf', unit: 'MWh', factorValue: .4303, resultUnit: 'tCO2e', applicability: 'ALBERTA_OFFSET_PROJECT' }, inventory]);
    expect(result?.factor.id).toBe('inventory');
    expect(980 * Number(result?.factor.factorValue)).toBe(519.4);
  });
  it.each(['CO2_COMPONENT', 'CH4_COMPONENT', 'N2O_COMPONENT'] as const)('blocks %s regardless of kgCO2e text', emissionBasis => {
    expect(match([{ ...inventory, emissionBasis }])).toBeUndefined();
  });
  it.each(['g CO2/L', 'kg CH4', 'g N2O', 'g CO₂/L'])('rejects explicit component unit %s even without metadata', resultUnit => {
    expect(isInventoryFactorEligible({ resultUnit })).toBe(false);
  });
  it('keeps direct CO2e and rejects unknown required sectors', () => {
    expect(isInventoryFactorEligible({ emissionBasis: 'DIRECT_CO2E', resultUnit: 'kgCO2e' })).toBe(true);
    expect(match([{ ...inventory, methodologyProvenance: { sectorApplicability: ['Industrial'] } }])).toBeUndefined();
  });
  it('rejects the approximate Table A8 GJ reference and refuses invented HHV conversion', () => {
    const gas = { ...inventory, activityType: 'NATURAL_GAS', id: 'eccc-natural-gas-canada-generic-gj-2025', name: 'Natural Gas', region: 'Canada (Generic)', sourceAuthority: 'Environment and Climate Change Canada', unit: 'GJ', factorValue: 49.44, methodologyProvenance: { sourceVersion: 'ECCC_EPR_2025_TABLE_A8', quantityBasis: 'ENERGY_HHV' as const } };
    const input = { activityType: 'NATURAL_GAS', quantity: 3, jurisdictionRegion: 'Alberta', jurisdictionCountry: 'Canada', recordYear: 2026, factors: [gas] };
    expect(findBestConversionFactorMatch({ ...input, inputUnit: 'GJ' })).toBeUndefined();
    expect(findBestConversionFactorMatch({ ...input, inputUnit: 'm3' })).toBeUndefined();
  });
});

describe('optional provenance presentation', () => {
  it('shows pinned document version and applicability as references without compliance claims', () => {
    const factor = { factorName: 'Alberta Electricity Grid Displacement', factorValue: .4303, inputUnit: 'MWh', resultUnit: 'tCO2e', sourceAuthority: provenance.sourceAuthority!, sourceDocument: provenance.sourceDocument, factorType: 'System' as const, verified: false, factorProvenance: provenance };
    const text = buildFactorDetailText(factor);
    expect(text).toContain('Carbon Offset Emission Factors Handbook');
    expect(text).toContain('Source Document Version: 3.2');
    expect(text).toContain('Applicability: Alberta Offset Project');
    expect(text).toContain('Methodology Reference: Method 1-1');
    expect(text).not.toMatch(/TIER compliant|SGRR compliant|Offset compliant|certified|Verification: Verified/i);
    expect(provenance.factorYear).toBe(2026); expect(provenance.sourceYear).toBe(2025);
    expect(factorProvenanceLines()).toEqual([]);
  });
  it('uses the existing CSV Validation Note column and preserves the column schema', () => {
    const detail = { activityDataId: 'fixture', activityType: 'ELECTRICITY', activityQuantity: 980, activityUnit: 'kWh', status: 'CALCULATED', factorId: 'fixture-factor', factorValue: .53, calculatedEmissionsKgCO2e: 519.4, sourceAuthority: provenance.sourceAuthority, sourceDocument: provenance.sourceDocument };
    const plain = buildPilotCsvRows({ calculationDetails: [detail] } as never)[0];
    const richer = buildPilotCsvRows({ calculationDetails: [{ ...detail, factorProvenance: provenance }] } as never)[0];
    expect(Object.keys(richer)).toEqual(Object.keys(plain));
    expect(richer['Validation Note']).toContain('Applicability: Alberta Offset Project');
    expect(richer['Validation Note']).toContain('Source Document Version: 3.2');
  });
});
