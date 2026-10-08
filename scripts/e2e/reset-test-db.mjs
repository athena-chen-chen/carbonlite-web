import { assertE2eDatabaseSafety, createPrismaClient } from './test-db-safety.mjs';

const { databaseName } = assertE2eDatabaseSafety();
const prisma = await createPrismaClient();

try {
  const tables = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  const quotedTables = tables
    .map(({ tablename }) => `"public"."${String(tablename).replace(/"/g, '""')}"`)
    .join(', ');

  if (quotedTables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`);
  }

  console.log(`[e2e] Reset database "${databaseName}".`);
} finally {
  await prisma.$disconnect();
}
