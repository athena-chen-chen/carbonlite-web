import { assertE2eDatabaseSafety } from './test-db-safety.mjs';

const notes = 'DEV/TEST ONLY. Manual Task 7 safety fixture; not a production CarbonLite factor. Publication is August 2025; the stored first-of-month date does not assert a publication day.';
export const TASK7_SOURCE_ID = 'dev-task7-source-alberta-offset-handbook-3-2';

/** @type {Array<import('../../src/utils/factorGovernance').FactorGovernance & {
 * id: string, name: string, activityType: string, category: string,
 * factorValue: number, unit: string, resultUnit: string, factorYear: number | null,
 * sourceTable: string, methodology: string
 * }>} */
export const TASK7_FACTOR_FIXTURES = [
  {
    id: 'dev-task7-alberta-electricity-grid-displacement-renewable-2026',
    name: 'Alberta Electricity Grid Displacement - Renewable - 2026',
    activityType: 'ELECTRICITY', category: 'ELECTRICITY', factorValue: 0.4303,
    unit: 'MWh', resultUnit: 'tCO2e', factorYear: 2026,
    applicability: 'ALBERTA_OFFSET_PROJECT', emissionBasis: 'DIRECT_CO2E',
    sourceTable: 'Table 1 — Electricity Grid Displacement Factors',
    methodology: 'Grid Displacement',
    methodologyProvenance: { methodologyMethod: 'Grid Displacement' },
  },
  {
    id: 'dev-task7-alberta-diesel-co2-component',
    name: 'Alberta Diesel Combustion - CO2 Component',
    activityType: 'DIESEL', category: 'FUEL', factorValue: 2681,
    unit: 'L', resultUnit: 'g CO2', factorYear: null,
    applicability: 'REFERENCE_ONLY', emissionBasis: 'CO2_COMPONENT',
    sourceTable: 'Table 7 — Emission Factors for Combustion of Refined Petroleum Products',
    methodology: 'CO2 Component. CO2 only; not a direct CO2e calculation factor.',
    methodologyProvenance: { quantityBasis: 'VOLUME' },
  },
];

export function assertTask7FixtureSafety(env = process.env) {
  if (!['development', 'test'].includes(env.NODE_ENV)) {
    throw new Error('Task 7 fixtures require NODE_ENV=development or test.');
  }
  let url;
  try { url = new URL(env.DATABASE_URL); } catch {
    throw new Error('Task 7 fixtures require a valid local PostgreSQL DATABASE_URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.searchParams.has('host') || url.searchParams.has('hostaddr') ||
      /prod|production|staging|stage/i.test(url.href)) {
    throw new Error('Task 7 fixtures require a local, non-production PostgreSQL database.');
  }
  // Reuse the existing E2E guard for test databases. Local development requires
  // its own explicit opt-in; neither route can target a remote database.
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (!databaseName || !/dev|local|test|e2e/i.test(databaseName)) {
    throw new Error('Task 7 fixture database name must contain dev, local, test, or e2e.');
  }
  if (env.ALLOW_TASK7_DEV_FIXTURES !== 'true') {
    throw new Error('Task 7 fixtures require ALLOW_TASK7_DEV_FIXTURES=true.');
  }
  if (env.NODE_ENV === 'test' && env === process.env) assertE2eDatabaseSafety();
}

export function task7FixtureRecords(fixture) {
  const source = {
    sourceAuthority: 'Alberta Environment and Protected Areas',
    sourceDocument: 'Carbon Offset Emission Factors Handbook',
    sourceVersion: '3.2', sourceYear: 2025,
    sourceUrl: 'https://www.alberta.ca/alberta-emission-offset-system',
    publishedDate: new Date('2025-08-01T00:00:00.000Z'),
    page: '', tableReference: 'Tables 1 and 7',
    country: 'Canada', jurisdictionRegion: 'Alberta', publisherType: 'GOVERNMENT',
    notes, isOfficial: false, isActive: true,
  };
  const governance = {
    applicability: fixture.applicability, emissionBasis: fixture.emissionBasis,
    methodologyProvenance: fixture.methodologyProvenance,
  };
  const version = {
    factorId: fixture.id, version: 'dev-test-1', factorValue: fixture.factorValue,
    inputUnit: fixture.unit, resultUnit: fixture.resultUnit,
    jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', factorYear: fixture.factorYear,
    status: 'DRAFT', confidenceLevel: 'DEMO', verified: false,
    verificationStatus: 'INTERNAL_REVIEW_REQUIRED', sourceId: TASK7_SOURCE_ID,
    sourceTable: fixture.sourceTable, methodology: fixture.methodology,
    notes, ...governance,
  };
  const legacy = {
    organizationId: null, name: fixture.name, type: 'EMISSION', activityType: fixture.activityType,
    jurisdiction: 'Alberta', region: 'Alberta', country: 'Canada',
    unit: fixture.unit, resultUnit: fixture.resultUnit, factorValue: fixture.factorValue,
    sourceAuthority: source.sourceAuthority, sourceDocument: source.sourceDocument,
    sourceYear: source.sourceYear, sourceUrl: source.sourceUrl, sourceReference: fixture.sourceTable,
    methodology: fixture.methodology, notes, confidenceLevel: 'DEMO',
    verificationStatus: 'INTERNAL_REVIEW_REQUIRED', verified: false,
    // This flag identifies shared library records for the Admin list. Task 7
    // applicability/basis gates independently exclude them from calculations.
    isDefault: false, isSystemDefault: true, ...governance,
    methodologyProvenance: { ...governance.methodologyProvenance, sourceVersion: source.sourceVersion, publishedDate: '2025-08-01' },
  };
  const factor = {
    activityType: fixture.activityType, displayName: fixture.name, category: fixture.category,
    description: notes, isSystem: true, isActive: true,
  };
  return { source, factor, version, legacy };
}

export async function seedTask7FactorFixtures(prisma, enums) {
  assertTask7FixtureSafety();
  // Validate against the actual generated Task 7 Prisma enums before any write.
  for (const fixture of TASK7_FACTOR_FIXTURES) {
    if (enums.FactorApplicability?.[fixture.applicability] !== fixture.applicability ||
        enums.EmissionBasis?.[fixture.emissionBasis] !== fixture.emissionBasis) {
      throw new Error('Generate the Prisma client from the Task 7 model before seeding fixtures.');
    }
  }
  await prisma.$transaction(async tx => {
    for (const fixture of TASK7_FACTOR_FIXTURES) {
      const { source, factor, version, legacy } = task7FixtureRecords(fixture);
      await tx.factorSource.upsert({ where: { id: TASK7_SOURCE_ID }, update: source, create: { id: TASK7_SOURCE_ID, ...source } });
      await tx.factor.upsert({ where: { id: fixture.id }, update: factor, create: { id: fixture.id, ...factor } });
      const versionId = `${fixture.id}-v1`;
      await tx.factorVersion.upsert({ where: { id: versionId }, update: version, create: { id: versionId, ...version } });
      await tx.conversionFactor.upsert({ where: { id: fixture.id }, update: legacy, create: { id: fixture.id, ...legacy } });
    }
  });
}
