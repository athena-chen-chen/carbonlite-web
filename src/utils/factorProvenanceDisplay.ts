import { factorProvenanceLines, type FactorProvenanceSnapshot } from './factorGovernance';
import { looksLikeInternalId, getDisplayFactorVersion } from './reportCredibility';
import { formatJurisdictionDisplayLabel } from './terminology';

type VersionProvenance = {
  factorId?: string | null;
  factorVersionId?: string | null;
  factorVersion?: string | number | null;
  sourceDocument?: string | null;
  sourceVersion?: string | null;
  methodologyProvenance?: FactorProvenanceSnapshot['methodologyProvenance'];
  factorProvenance?: FactorProvenanceSnapshot | null;
};

export { getDisplayFactorVersion } from './reportCredibility';

/** A version written in a document title belongs to the source document. */
export function getDisplaySourceDocumentVersion(input: VersionProvenance): string {
  const provenance = input.factorProvenance;
  const value = input.sourceVersion ?? provenance?.sourceVersion ?? input.methodologyProvenance?.sourceVersion ?? provenance?.methodologyProvenance?.sourceVersion;
  const explicit = String(value ?? '').trim();
  if (explicit && !looksLikeInternalId(explicit)) return explicit;
  const document = input.sourceDocument ?? provenance?.sourceDocument;
  return String(document ?? '').match(/\bv\d+(?:\.\d+){0,3}\b/i)?.[0] ?? '';
}

export function getDisplayFactorProvenanceLines(input: VersionProvenance): string[] {
  return [
    ...getDisplayFactorVersionLines(input),
    ...factorProvenanceLines(input.factorProvenance).filter(line => !line.startsWith('Source Document Version: ')),
  ];
}

export function getDisplayFactorVersionLines(input: VersionProvenance): string[] {
  const factorVersion = getDisplayFactorVersion(input);
  const sourceVersion = getDisplaySourceDocumentVersion(input);
  return [
    ...(factorVersion ? [`Factor Version: ${factorVersion}`] : []),
    ...(sourceVersion ? [`Source Document Version: ${sourceVersion}`] : []),
  ];
}

/** Uses factor provenance only; never infer a factor's location from activity. */
export function getDisplayFactorJurisdiction(input: {
  factorJurisdictionRegion?: string | null;
  factorJurisdictionCountry?: string | null;
}): string {
  return formatJurisdictionDisplayLabel(input.factorJurisdictionRegion, input.factorJurisdictionCountry) || 'Not specified';
}
