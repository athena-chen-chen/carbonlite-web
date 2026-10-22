import {
  DEFAULT_E2E_EMAIL,
  DEFAULT_E2E_FACILITY_ID,
  DEFAULT_E2E_ORG_ID,
  DEFAULT_E2E_PASSWORD,
  DEFAULT_E2E_USER_ID,
  assertE2eDatabaseSafety,
  createPrismaClient,
  importFromApiNodeModules,
} from './test-db-safety.mjs';

assertE2eDatabaseSafety();

const prisma = await createPrismaClient();
const bcryptModule = await importFromApiNodeModules('bcryptjs/index.js');
const hash = bcryptModule.default?.hash ?? bcryptModule.hash;

const now = new Date();

async function upsertFactor(input) {
  await prisma.conversionFactor.upsert({
    where: { id: input.id },
    update: {
      name: input.name,
      type: 'EMISSION',
      activityType: input.activityType,
      jurisdiction: input.jurisdiction,
      region: input.region,
      country: 'Canada',
      unit: input.unit,
      factorValue: input.factorValue,
      resultUnit: 'kgCO2e',
      sourceAuthority: input.sourceAuthority ?? 'CarbonLite E2E Seed',
      sourceDocument: input.sourceDocument ?? 'Deterministic E2E baseline factors',
      sourceReference: input.sourceReference ?? 'E2E seed',
      sourceYear: input.sourceYear ?? 2025,
      sourceUrl: input.sourceUrl ?? 'https://carbonlite.test/e2e/factors',
      confidenceLevel: input.confidenceLevel ?? 'E2E_TEST',
      verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
      verified: false,
      isDefault: true,
      isSystemDefault: true,
      notes: input.notes ?? 'Deterministic E2E factor. Not for production reporting.',
    },
    create: {
      id: input.id,
      organizationId: null,
      name: input.name,
      type: 'EMISSION',
      activityType: input.activityType,
      jurisdiction: input.jurisdiction,
      region: input.region,
      country: 'Canada',
      unit: input.unit,
      factorValue: input.factorValue,
      resultUnit: 'kgCO2e',
      sourceAuthority: input.sourceAuthority ?? 'CarbonLite E2E Seed',
      sourceDocument: input.sourceDocument ?? 'Deterministic E2E baseline factors',
      sourceReference: input.sourceReference ?? 'E2E seed',
      sourceYear: input.sourceYear ?? 2025,
      sourceUrl: input.sourceUrl ?? 'https://carbonlite.test/e2e/factors',
      confidenceLevel: input.confidenceLevel ?? 'E2E_TEST',
      verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
      verified: false,
      isDefault: true,
      isSystemDefault: true,
      notes: input.notes ?? 'Deterministic E2E factor. Not for production reporting.',
    },
  });
}

try {
  const passwordHash = await hash(DEFAULT_E2E_PASSWORD, 10);

  await prisma.organization.upsert({
    where: { id: DEFAULT_E2E_ORG_ID },
    update: {
      name: 'CarbonLite E2E Org',
      slug: 'carbonlite-e2e-org',
      country: 'Canada',
      provinceState: 'Alberta',
      city: 'Calgary',
      defaultReportingYear: 2025,
      allowDemoFactorsForCalculations: true,
      isActive: true,
    },
    create: {
      id: DEFAULT_E2E_ORG_ID,
      name: 'CarbonLite E2E Org',
      slug: 'carbonlite-e2e-org',
      country: 'Canada',
      provinceState: 'Alberta',
      city: 'Calgary',
      defaultReportingYear: 2025,
      allowDemoFactorsForCalculations: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.user.upsert({
    where: { id: DEFAULT_E2E_USER_ID },
    update: {
      organizationId: DEFAULT_E2E_ORG_ID,
      email: DEFAULT_E2E_EMAIL,
      passwordHash,
      firstName: 'CarbonLite',
      lastName: 'E2E',
      role: 'USER',
      accountType: 'INTERNAL_TEST',
      isActive: true,
      passwordSetupRequired: false,
    },
    create: {
      id: DEFAULT_E2E_USER_ID,
      organizationId: DEFAULT_E2E_ORG_ID,
      email: DEFAULT_E2E_EMAIL,
      passwordHash,
      firstName: 'CarbonLite',
      lastName: 'E2E',
      role: 'USER',
      accountType: 'INTERNAL_TEST',
      isActive: true,
      passwordSetupRequired: false,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: DEFAULT_E2E_USER_ID,
        organizationId: DEFAULT_E2E_ORG_ID,
      },
    },
    update: { role: 'OWNER' },
    create: {
      userId: DEFAULT_E2E_USER_ID,
      organizationId: DEFAULT_E2E_ORG_ID,
      role: 'OWNER',
    },
  });

  await prisma.facility.upsert({
    where: { id: DEFAULT_E2E_FACILITY_ID },
    update: {
      organizationId: DEFAULT_E2E_ORG_ID,
      name: 'Calgary HQ',
      code: 'YYC-HQ',
      type: 'OFFICE',
      city: 'Calgary',
      provinceState: 'Alberta',
      country: 'Canada',
      isActive: true,
    },
    create: {
      id: DEFAULT_E2E_FACILITY_ID,
      organizationId: DEFAULT_E2E_ORG_ID,
      name: 'Calgary HQ',
      code: 'YYC-HQ',
      type: 'OFFICE',
      city: 'Calgary',
      provinceState: 'Alberta',
      country: 'Canada',
      isActive: true,
    },
  });

  await upsertFactor({
    id: 'e2e-factor-electricity-alberta-2025',
    name: 'Electricity - Alberta - E2E',
    activityType: 'ELECTRICITY',
    jurisdiction: 'Alberta',
    region: 'Alberta',
    unit: 'kWh',
    factorValue: 0.53,
  });

  await upsertFactor({
    id: 'e2e-factor-hotel-canada-2025',
    name: 'Hotel stays - Canada - E2E',
    activityType: 'HOTEL',
    jurisdiction: 'Canada (Generic)',
    region: 'Canada',
    unit: 'nights',
    factorValue: 15,
  });

  // Confirmation retries and the golden import fixtures also require these
  // factors. Keep the test baseline complete after an empty-database reset.
  await upsertFactor({
    id: 'e2e-factor-diesel-canada-2025',
    name: 'Diesel - Canada - E2E',
    activityType: 'DIESEL',
    jurisdiction: 'Canada (Generic)',
    region: 'Canada',
    unit: 'L',
    factorValue: 2.68,
  });

  await upsertFactor({
    id: 'e2e-factor-gasoline-canada-2025',
    name: 'Gasoline - Canada - E2E',
    activityType: 'GASOLINE',
    jurisdiction: 'Canada (Generic)',
    region: 'Canada',
    unit: 'L',
    factorValue: 2.31,
  });

  await upsertFactor({
    id: 'e2e-factor-air-travel-canada-2025',
    name: 'Air travel - Canada - E2E',
    activityType: 'AIR_TRAVEL',
    jurisdiction: 'Canada (Generic)',
    region: 'Canada',
    unit: 'km',
    factorValue: 0.115,
  });

  await upsertFactor({
    id: 'e2e-factor-natural-gas-m3-2025',
    name: 'Natural Gas - Canada m3 - E2E',
    activityType: 'NATURAL_GAS',
    jurisdiction: 'Canada (Generic)',
    region: 'Canada',
    unit: 'm3',
    factorValue: 1.89,
  });

  await upsertFactor({
    id: 'e2e-factor-natural-gas-gj-2025',
    name: 'Natural Gas - Canada Generic',
    activityType: 'NATURAL_GAS',
    jurisdiction: 'Canada (Generic)',
    region: 'Canada',
    unit: 'GJ',
    factorValue: 49.44,
    sourceAuthority: 'Environment and Climate Change Canada',
    sourceDocument: 'Greenhouse gas and air pollutant emissions projections – 2025',
    sourceReference: 'Table A8',
    sourceYear: 2025,
    sourceUrl: 'https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/projections/2025-report.html',
    confidenceLevel: 'HIGH',
    notes:
      'ECCC Table A8 national Natural Gas CO2e estimate. Approximate estimate; actual emission factors may vary by year, sector, and province.',
  });

  console.log(`[e2e] Seeded deterministic baseline user ${DEFAULT_E2E_EMAIL}.`);
} finally {
  await prisma.$disconnect();
}
