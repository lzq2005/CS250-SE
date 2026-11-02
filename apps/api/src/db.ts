import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
process.env.DATABASE_URL ??= 'file:./dev.db';
export const prisma = new PrismaClient();
export async function probeDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
