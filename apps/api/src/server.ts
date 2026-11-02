import { createApp } from './app.js';
import { prisma } from './db.js';
const port = Number(process.env.API_PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT must be a valid port.');
const server = createApp().listen(port, process.env.API_HOST ?? '127.0.0.1', () => console.log(`TripMate API listening on ${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => {
  server.close(() => { void prisma.$disconnect().finally(() => process.exit(0)); });
});
