import { createPrismaClient, importFromApiNodeModules } from './test-db-safety.mjs';
import { assertTask7FixtureSafety, seedTask7FactorFixtures, TASK7_FACTOR_FIXTURES } from './task7-factor-fixtures.mjs';

assertTask7FixtureSafety();
const enums = await importFromApiNodeModules('@prisma/client/default.js');
const prisma = await createPrismaClient();
try {
  await seedTask7FactorFixtures(prisma, enums);
  for (const fixture of TASK7_FACTOR_FIXTURES) console.log(`[dev/test] Ensured ${fixture.id}: ${fixture.name}`);
} finally {
  await prisma.$disconnect();
}
