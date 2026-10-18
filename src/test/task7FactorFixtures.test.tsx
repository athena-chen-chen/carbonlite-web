import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { assertTask7FixtureSafety, TASK7_FACTOR_FIXTURES, TASK7_SOURCE_ID, task7FixtureRecords, seedTask7FactorFixtures } from '../../scripts/e2e/task7-factor-fixtures.mjs';
import { importFromApiNodeModules } from '../../scripts/e2e/test-db-safety.mjs';
import { findBestConversionFactorMatch } from '../utils/conversionFactorMatching';
import { isInventoryFactorEligible } from '../utils/factorGovernance';
import { FactorDetailsPage } from '../pages/FactorDetailsPage';
import { getFactorVersion, getFactorVersions, getFactorHistory, getFactorVersionUsage } from '../services/factorVersions';

vi.mock('../services/factorVersions', () => ({ getFactorVersion: vi.fn(), getFactorVersions: vi.fn(), getFactorHistory: vi.fn(), getFactorVersionUsage: vi.fn() }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

const devEnv = { NODE_ENV: 'development', DATABASE_URL: 'postgresql://fixture:fixture@localhost/carbonlite_dev', ALLOW_TASK7_DEV_FIXTURES: 'true' };

describe('Task 7 fixture isolation', () => {
  it('allows an explicitly opted-in local development database', () => {
    expect(() => assertTask7FixtureSafety(devEnv)).not.toThrow();
  });
  it.each([
    { NODE_ENV: 'production' }, { NODE_ENV: undefined }, { ALLOW_TASK7_DEV_FIXTURES: undefined },
    { DATABASE_URL: 'postgresql://fixture:fixture@remote.example/carbonlite_test' },
    { DATABASE_URL: 'postgresql://fixture:fixture@localhost/carbonlite_production_test' },
    { DATABASE_URL: 'postgresql://fixture:fixture@localhost/neondb' },
    { DATABASE_URL: 'postgresql://fixture:fixture@localhost/carbonlite_dev?host=remote.example' },
    { DATABASE_URL: 'https://localhost/carbonlite_test' },
  ])('refuses unsafe configuration %j', overrides => {
    expect(() => assertTask7FixtureSafety({ ...devEnv, ...overrides })).toThrow();
  });
  it('validates the actual Prisma enums and produces no duplicates on two runs', async () => {
    for (const [key, value] of Object.entries(devEnv)) vi.stubEnv(key, value);
    const enums = await importFromApiNodeModules('@prisma/client/default.js');
    const stores = Object.fromEntries(['factorSource', 'factor', 'factorVersion', 'conversionFactor'].map(name => [name, new Map()]));
    const tx = Object.fromEntries(Object.entries(stores).map(([name, records]) => [name, {
      upsert: vi.fn(async ({ where, create, update }) => {
        records.set(where.id, records.has(where.id) ? { ...records.get(where.id), ...update } : create);
      }),
    }]));
    const prisma = { $transaction: vi.fn(async callback => callback(tx)) };
    await seedTask7FactorFixtures(prisma, enums);
    const before = JSON.stringify(Object.values(stores).map(store => [...store.values()]));
    await seedTask7FactorFixtures(prisma, enums);
    expect(Object.values(stores).map(store => store.size)).toEqual([1, 2, 2, 2]);
    expect(JSON.stringify(Object.values(stores).map(store => [...store.values()]))).toBe(before);
    expect(stores.factorSource.has(TASK7_SOURCE_ID)).toBe(true);
    expect([...stores.factorVersion.values()].map(v => v.factorYear)).toEqual([2026, null]);
    prisma.$transaction.mockClear();
    await expect(seedTask7FactorFixtures(prisma, {})).rejects.toThrow('Task 7 model');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    vi.stubEnv('NODE_ENV', 'production');
    await expect(seedTask7FactorFixtures(prisma, enums)).rejects.toThrow('NODE_ENV');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('exact seeded fixture matching', () => {
  it.each(TASK7_FACTOR_FIXTURES)('excludes $name in legacy and governed candidates', fixture => {
    const { legacy, version, factor } = task7FixtureRecords(fixture);
    const inventory = {
      id: 'existing-inventory', name: `${fixture.activityType} - Alberta - 2025`,
      activityType: fixture.activityType, unit: fixture.activityType === 'DIESEL' ? 'L' : 'kWh',
      factorValue: fixture.activityType === 'DIESEL' ? 2.68 : .53, resultUnit: 'kgCO2e',
      region: 'Alberta', country: 'Canada', sourceYear: 2025, isSystemDefault: true,
    };
    const input = { activityType: fixture.activityType, inputUnit: inventory.unit,
      quantity: fixture.activityType === 'DIESEL' ? 100 : 1000,
      jurisdictionRegion: 'Alberta', jurisdictionCountry: 'Canada', recordYear: 2026 };
    const governed = { ...factor, id: fixture.id, name: fixture.name, currentActiveVersion: { ...version, id: `${fixture.id}-v1` } };
    for (const candidate of [{ id: fixture.id, ...legacy }, governed]) {
      expect(isInventoryFactorEligible(legacy)).toBe(false);
      expect(isInventoryFactorEligible(version)).toBe(false);
      expect(findBestConversionFactorMatch({ ...input, factors: [candidate] })).toBeUndefined();
      const match = findBestConversionFactorMatch({ ...input, factors: [candidate, inventory] });
      expect(match?.factor.id).toBe(inventory.id);
      expect(input.quantity * Number(match?.factor.factorValue)).toBe(fixture.activityType === 'DIESEL' ? 268 : 530);
    }
    expect(legacy.isDefault).toBe(false);
    expect(legacy.isSystemDefault).toBe(true);
    if (fixture.activityType === 'DIESEL') {
      expect(version.factorValue).toBe(2681);
      expect(version.resultUnit).toBe('g CO2');
      // Component metadata still blocks it if someone mistakenly changes the unit.
      expect(isInventoryFactorEligible({ ...version, applicability: 'CORPORATE_INVENTORY', resultUnit: 'kgCO2e' })).toBe(false);
    }
  });
});

describe('seeded fixture Admin View provenance', () => {
  it.each(TASK7_FACTOR_FIXTURES)('shows $name with supported provenance fields', async fixture => {
    const { version, source } = task7FixtureRecords(fixture);
    vi.mocked(getFactorVersion).mockResolvedValue({ ...version, id: `${fixture.id}-v1`, displayName: fixture.name,
      source: { ...source, id: TASK7_SOURCE_ID, publishedDate: source.publishedDate.toISOString() } } as never);
    vi.mocked(getFactorVersions).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(getFactorHistory).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(getFactorVersionUsage).mockResolvedValue({ reportsUsingThisFactor: 0, activityRecordsUsingThisFactor: 0, calculations: 0, organizations: 0, recentCalculations: [] });
    render(<MemoryRouter initialEntries={[`/factor-versions/${fixture.id}-v1`]}><Routes><Route path="/factor-versions/:factorVersionId" element={<FactorDetailsPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(fixture.activityType === 'DIESEL' ? 'Reference Only' : 'Alberta Offset Project')).toBeInTheDocument();
    expect(screen.getByText('Alberta Environment and Protected Areas')).toBeInTheDocument();
    expect(screen.getByText('Carbon Offset Emission Factors Handbook')).toBeInTheDocument();
    expect(screen.getByText('3.2')).toBeInTheDocument();
    expect(screen.getByText(fixture.sourceTable)).toBeInTheDocument();
    expect(screen.getByText(fixture.activityType === 'DIESEL' ? 'Reference Only' : 'Alberta Offset Project')).toBeInTheDocument();
    expect(screen.getByText(fixture.emissionBasis.replaceAll('_', ' '))).toBeInTheDocument();
    if (fixture.factorYear) {
      expect(screen.getAllByText('2026').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Grid Displacement').length).toBeGreaterThan(0);
    }
    expect(screen.queryByText(/TIER compliant|Certified|Verified under/i)).not.toBeInTheDocument();
  });
});
