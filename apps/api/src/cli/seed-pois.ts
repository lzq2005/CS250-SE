// Manual entry only. Never imported by app.ts, server.ts or database setup.
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { parsePoiSeed, seedPois } from '../features/pois/poi.seed.js';

const usage = `Usage: npm run db:seed:pois -- --database <absolute SQLite path> --input <POI JSON path> [--dry-run]
Apply approved data only: add --apply --approved-sha256 <reviewed file SHA-256>.
Database must already exist and be migrated. No env/default database or fixture is selected.`;

async function main() {
  const { values } = parseArgs({ options: {
    database: { type: 'string' }, input: { type: 'string' },
    'dry-run': { type: 'boolean' }, apply: { type: 'boolean' },
    'approved-sha256': { type: 'string' }, help: { type: 'boolean' },
  }, strict: true, allowPositionals: false });
  if (values.help) { console.log(usage); return; }
  if (!values.database || !isAbsolute(values.database) || !values.input) throw new Error(usage);
  if (values.apply && values['dry-run']) throw new Error('--apply and --dry-run are mutually exclusive.');
  const dryRun = !values.apply;
  const inputPath = realpathSync(resolve(values.input));
  const bytes = readFileSync(inputPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  // Validate the entire batch and approval guard before opening the database.
  const pois = parsePoiSeed(JSON.parse(bytes.toString('utf8')) as unknown);
  if (!dryRun && values['approved-sha256']?.toLowerCase() !== sha256) {
    throw new Error('Apply requires --approved-sha256 matching the reviewed input file. A hash is not team approval.');
  }
  const databasePath = realpathSync(values.database);
  if (!statSync(databasePath).isFile()) throw new Error('Database path must be an existing SQLite file.');
  // Escape URI delimiters in paths; dry-run opens SQLite in read-only mode.
  const databaseUrl = `file:${databasePath.replaceAll('\\', '/').replaceAll('%', '%25').replaceAll('?', '%3F').replaceAll('#', '%23')}${dryRun ? '?mode=ro' : ''}`;
  const database = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const existing = await database.pOI.findMany({ select: { id: true, name: true } });
    const normalize = (name: string) => name.normalize('NFKC').trim().toLowerCase();
    const identities = pois.map(poi => {
      const uuidMatches = existing.filter(row => row.id.toLowerCase() === poi.id.toLowerCase());
      const nameMatches = existing.filter(row => normalize(row.name) === normalize(poi.name));
      return { id: poi.id, name: poi.name, uuidMatches, nameMatches,
        conflict: [...uuidMatches, ...nameMatches].some(row => row.id !== poi.id) };
    });
    console.log(JSON.stringify({ database: databasePath, input: inputPath, sha256, dryRun,
      poiCountBefore: existing.length, identities }, null, 2));
    // B owns validation, collision rejection, transactions and all writes.
    const summary = await seedPois(database, pois, { dryRun });
    const poiCountAfter = await database.pOI.count();
    console.log(JSON.stringify({ summary, poiCountAfter }, null, 2));
  } finally { await database.$disconnect(); }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'POI seed failed.');
  process.exitCode = 1;
});
