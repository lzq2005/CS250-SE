import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
process.env.DATABASE_URL ??= 'file:./dev.db';
// Initialize the SQLite file before Prisma migrate deploy (first-run Windows engine behavior).
const prisma = new PrismaClient();
try { await prisma.$queryRaw`SELECT 1`; } finally { await prisma.$disconnect(); }
const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma'], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
