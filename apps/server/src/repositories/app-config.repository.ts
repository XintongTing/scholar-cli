import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

export interface AppConfigRow {
  key: string;
  value: string;
}

export async function findMany(keys: string[]) {
  if (keys.length === 0) return [];

  return prisma.$queryRaw<AppConfigRow[]>(
    Prisma.sql`SELECT "key", "value" FROM "AppConfig" WHERE "key" IN (${Prisma.join(keys)})`
  );
}

export async function upsert(key: string, value: string) {
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "AppConfig" ("key", "value", "createdAt", "updatedAt")
      VALUES (${key}, ${value}, NOW(), NOW())
      ON CONFLICT ("key")
      DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()
    `
  );
}

export async function remove(key: string) {
  await prisma.$executeRaw(
    Prisma.sql`DELETE FROM "AppConfig" WHERE "key" = ${key}`
  );
}
