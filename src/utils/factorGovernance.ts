import { isMethodologySupportedForInventory, type InventoryMethodMetadata } from './factorMethodology';
export const FACTOR_APPLICABILITIES = ['CORPORATE_INVENTORY', 'ALBERTA_OFFSET_PROJECT', 'ALBERTA_TIER_SGRR', 'REFERENCE_ONLY'] as const;
export const EMISSION_BASES = ['DIRECT_CO2E', 'CO2_COMPONENT', 'CH4_COMPONENT', 'N2O_COMPONENT'] as const;
export type FactorApplicability = typeof FACTOR_APPLICABILITIES[number];
export type EmissionBasis = typeof EMISSION_BASES[number];

/** References only: these fields do not establish regulatory compliance. */
export type MethodologyProvenance = {
  methodologyDocument?: string;
  methodologyVersion?: string;
  methodologyMethod?: string;
  methodologySection?: string;
  methodologyLevel?: string;
  sectorApplicability?: string[];
  quantityBasis?: 'ENERGY_HHV' | 'VOLUME';
  gwpSource?: string;
  gwpVersion?: string;
  /** Legacy factors have no FactorSource relation. */
  sourceVersion?: string;
  publishedDate?: string;
  /** Governed fields copied into the legacy Admin provenance projection. */
  factorYear?: number;
  factorVersion?: string;
  sourceTable?: string;
};
export type FactorGovernance = {
  applicability?: FactorApplicability | null;
  emissionBasis?: EmissionBasis | null;
  methodologyProvenance?: MethodologyProvenance | null;
};
export type FactorProvenanceSnapshot = FactorGovernance & {
  factorId?: string | null;
  factorVersionId?: string | null;
  factorVersion?: string | null;
  sourceAuthority?: string | null;
  sourceDocument?: string | null;
  sourceVersion?: string | null;
  sourceYear?: number | null;
  publishedDate?: string | null;
  factorYear?: number | null;
  sourceTable?: string | null;
  sourceSection?: string | null;
};

/** Null metadata preserves legacy eligibility. Restricted sectors need explicit
 * activity context, which today's inventory workflow does not collect. */
export function isInventoryFactorEligible(factor: InventoryMethodMetadata & {
  applicability?: string | null;
  emissionBasis?: string | null;
  methodologyProvenance?: unknown;
  resultUnit?: string | null;
}): boolean {
  if (!isMethodologySupportedForInventory(factor)) return false;
  if (factor.applicability != null && factor.applicability !== 'CORPORATE_INVENTORY') return false;
  if (factor.emissionBasis != null && factor.emissionBasis !== 'DIRECT_CO2E') return false;
  const provenance = factor.methodologyProvenance;
  if (provenance != null) {
    if (typeof provenance !== 'object' || Array.isArray(provenance)) return false;
    const sectors = (provenance as MethodologyProvenance).sectorApplicability;
    if (sectors != null && (!Array.isArray(sectors) || sectors.length > 0)) return false;
  }
  // Explicit component units remain unsafe even if metadata is missing or wrong.
  const unit = String(factor.resultUnit ?? '').toUpperCase().replace(/[\s₂₄]/g, (char) => char === '₂' ? '2' : char === '₄' ? '4' : '');
  return !/CH4|N2O|CO2(?!E|EQ|EQUIVALENT)/.test(unit);
}

export function factorProvenanceLines(provenance?: FactorProvenanceSnapshot | null): string[] {
  if (!provenance) return [];
  const applicabilityLabels: Record<FactorApplicability, string> = {
    CORPORATE_INVENTORY: 'Corporate Inventory', ALBERTA_OFFSET_PROJECT: 'Alberta Offset Project',
    ALBERTA_TIER_SGRR: 'Alberta TIER / SGRR', REFERENCE_ONLY: 'Reference Only',
  };
  const methodology = provenance.methodologyProvenance;
  const fields = [
    ['Source Document Version', provenance.sourceVersion ?? methodology?.sourceVersion],
    ['Publication Date', provenance.publishedDate ?? methodology?.publishedDate],
    ['Applicability', provenance.applicability && applicabilityLabels[provenance.applicability]],
    ['Emission Basis', provenance.emissionBasis?.replaceAll('_', ' ')],
    ['Factor Vintage', provenance.factorYear ?? methodology?.factorYear],
    ['Source Table', methodology?.sourceTable],
    ['Methodology Document', methodology?.methodologyDocument],
    ['Methodology Version', methodology?.methodologyVersion],
    ['Methodology Reference', methodology?.methodologyMethod],
    ['Methodology Section', methodology?.methodologySection ?? provenance.sourceSection],
    ['Methodology Level Reference', methodology?.methodologyLevel],
    ['Sector Applicability', methodology?.sectorApplicability?.join(', ')],
    ['Quantity Basis', methodology?.quantityBasis?.replaceAll('_', ' ')],
    ['GWP Source', methodology?.gwpSource], ['GWP Version', methodology?.gwpVersion],
  ];
  return fields.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
}

export function captureFactorGovernance(factor: FactorGovernance & {
  id: string; sourceAuthority?: string | null; sourceDocument?: string | null;
  sourceYear?: number | null; factorYear?: number | null;
  currentActiveVersion?: (FactorGovernance & { id?: string }) | null;
  version?: (FactorGovernance & { id?: string }) | null;
}): FactorProvenanceSnapshot | null {
  const selected = factor.currentActiveVersion ?? factor.version ?? factor;
  // Keep legacy reports byte-for-byte unchanged when there is no new metadata.
  if (!selected.applicability && !selected.emissionBasis && !selected.methodologyProvenance) return null;
  return JSON.parse(JSON.stringify({
    factorId: factor.id, factorVersionId: selected === factor ? null : selected.id,
    applicability: selected.applicability, emissionBasis: selected.emissionBasis,
    methodologyProvenance: selected.methodologyProvenance,
    sourceAuthority: factor.sourceAuthority, sourceDocument: factor.sourceDocument,
    sourceYear: factor.sourceYear, factorYear: factor.factorYear,
  }));
}
