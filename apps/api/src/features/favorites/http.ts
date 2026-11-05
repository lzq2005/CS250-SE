import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';
import type { Failure } from '@tripmate/contracts';

// Internal B relation boundary, not a new shared DTO/error middleware registration.
export class RelationError extends Error {
  constructor(public status: number, public code: string, message: string, public details: Record<string, unknown> | null = null) {
    super(message);
  }
}
export function uuid(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value)) {
    throw new RelationError(400, 'BAD_REQUEST', `Invalid UUID: ${path}.`);
  }
  return value;
}
export function noQuery(query: object) {
  if (Object.keys(query).length) throw new RelationError(400, 'BAD_REQUEST', 'Query parameters are not supported.');
}
export function invalidBody(reason: string): never {
  throw new RelationError(422, 'VALIDATION_ERROR', 'Invalid request body.', { fields: [{ path: 'body', reason }] });
}
export function noBody(body: unknown) {
  if (body !== undefined) invalidBody('This operation does not accept a body.');
}
export const relationErrors: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  let failure: RelationError;
  if (error instanceof RelationError) failure = error;
  else if (error instanceof URIError) failure = new RelationError(400, 'BAD_REQUEST', 'Invalid URL encoding.');
  else if (error instanceof Prisma.PrismaClientInitializationError || (error instanceof Prisma.PrismaClientKnownRequestError
    && ['P1001', 'P1002', 'P1003', 'P1008', 'P1017', 'P2021', 'P2022', 'P2024'].includes(error.code))) {
    failure = new RelationError(503, 'STORAGE_UNAVAILABLE', 'Database is unavailable.');
  } else { next(error); return; }
  res.status(failure.status).json({ error: { code: failure.code, message: failure.message, details: failure.details } } satisfies Failure);
};
