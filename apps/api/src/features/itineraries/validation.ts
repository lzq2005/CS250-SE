import type {
  CandidatePlan,
  EditCommand,
  PlannerInput,
  SaveItineraryRequest,
  TravelMode,
} from '@tripmate/contracts';
import { ItineraryError } from './errors.js';

const uuidPattern = /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
const localTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function invalid(path: string, reason: string): never {
  throw new ItineraryError(422, 'VALIDATION_ERROR', '行程保存请求无效。', {
    fields: [{ path, reason }],
  });
}

function record(value: unknown, path: string, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(path, '必须为对象');
  const result = value as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (!keys.includes(key)) invalid(`${path}.${key}`, '不支持的字段');
  }
  return result;
}

function uuid(value: unknown, path: string): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) invalid(path, '必须为 UUID');
  return value;
}

function version(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    invalid(path, '必须为正整数');
  }
  return value;
}

function editCommand(value: unknown, path: string): EditCommand {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(path, '必须为对象');
  const command = value as Record<string, unknown>;
  if (command.type === 'setVisitTime') {
    record(command, path, ['type', 'stopId', 'start', 'end']);
    const stopId = uuid(command.stopId, `${path}.stopId`);
    if (
      typeof command.start !== 'string' ||
      !localTimePattern.test(command.start) ||
      Number(command.start.slice(3)) % 15 !== 0 ||
      typeof command.end !== 'string' ||
      !localTimePattern.test(command.end) ||
      Number(command.end.slice(3)) % 15 !== 0 ||
      command.start >= command.end
    ) {
      invalid(path, '编辑时间必须为同日 15 分钟粒度且 start < end');
    }
    return { type: 'setVisitTime', stopId, start: command.start, end: command.end };
  }
  if (command.type === 'setTransportMode') {
    record(command, path, ['type', 'date', 'toPoiId', 'mode']);
    if (typeof command.date !== 'string' || !localDatePattern.test(command.date)) {
      invalid(`${path}.date`, '必须为 YYYY-MM-DD');
    }
    if (!['walk', 'bus', 'taxi'].includes(command.mode as string)) {
      invalid(`${path}.mode`, '必须为 walk/bus/taxi');
    }
    return {
      type: 'setTransportMode',
      date: command.date,
      toPoiId: uuid(command.toPoiId, `${path}.toPoiId`),
      mode: command.mode as TravelMode,
    };
  }
  if (command.type === 'removeStop') {
    record(command, path, ['type', 'stopId', 'confirmed']);
    if (command.confirmed !== true) invalid(`${path}.confirmed`, '删除必须显式确认');
    return {
      type: 'removeStop',
      stopId: uuid(command.stopId, `${path}.stopId`),
      confirmed: true,
    };
  }
  return invalid(`${path}.type`, '不支持的编辑命令');
}

export function validateCandidate(value: unknown, path = 'candidate'): CandidatePlan {
  const candidate = record(value, path, ['input', 'result', 'commands']);
  const input = candidate.input as PlannerInput;
  if (!input || typeof input !== 'object') invalid(`${path}.input`, '必须为 PlannerInput');
  if (!Array.isArray(input.selectedPois)) invalid(`${path}.input.selectedPois`, '必须为数组');
  if (!input.trip || typeof input.trip !== 'object') invalid(`${path}.input.trip`, '必须为 TripConfig');
  uuid(input.trip.id, `${path}.input.trip.id`);

  const result = candidate.result as CandidatePlan['result'];
  if (!result || typeof result !== 'object' || !Array.isArray(result.days)) {
    invalid(`${path}.result`, '必须为 PlanResult');
  }
  uuid(result.tripId, `${path}.result.tripId`);
  if (result.tripId !== input.trip.id) invalid(`${path}.result.tripId`, '必须与 input.trip.id 一致');

  if (!Array.isArray(candidate.commands)) invalid(`${path}.commands`, '必须为数组');
  const commands = candidate.commands.map((command, index) =>
    editCommand(command, `${path}.commands.${index}`),
  );
  return { input, result, commands };
}

export function validateSaveRequest(value: unknown): SaveItineraryRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('body', '必须为对象');
  const body = value as Record<string, unknown>;
  if (body.mode === 'create') {
    record(body, 'body', ['mode', 'candidate']);
    return { mode: 'create', candidate: validateCandidate(body.candidate) };
  }
  if (body.mode === 'overwrite') {
    record(body, 'body', ['mode', 'itineraryId', 'expectedVersion', 'confirmed', 'candidate']);
    if (body.confirmed !== true) invalid('body.confirmed', '覆盖必须显式确认');
    return {
      mode: 'overwrite',
      itineraryId: uuid(body.itineraryId, 'body.itineraryId'),
      expectedVersion: version(body.expectedVersion, 'body.expectedVersion'),
      confirmed: true,
      candidate: validateCandidate(body.candidate),
    };
  }
  return invalid('body.mode', '必须为 create 或 overwrite');
}

export function validateEditRequest(value: unknown): { expectedVersion: number; command: EditCommand } {
  const body = record(value, 'body', ['expectedVersion', 'command']);
  return {
    expectedVersion: version(body.expectedVersion, 'body.expectedVersion'),
    command: editCommand(body.command, 'body.command'),
  };
}

export function validateUuid(value: string, path: string): string {
  return uuid(value, path);
}
