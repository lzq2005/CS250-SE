import { isDeepStrictEqual } from 'node:util';
import type {
  CandidatePlan,
  EditCommand,
  PlannerInput,
  PlannerService,
  PlanResult,
  TimeOverride,
} from '@tripmate/contracts';
import { ItineraryError } from './errors.js';

export function applyOverride(
  overrides: Map<string, TimeOverride>,
  command: EditCommand,
): void {
  if (command.type === 'setVisitTime') {
    overrides.set(command.stopId, {
      stopId: command.stopId,
      start: command.start,
      end: command.end,
    });
  }
  if (command.type === 'removeStop') overrides.delete(command.stopId);
}

export async function replayCandidate(
  input: PlannerInput,
  commands: EditCommand[],
  expectedResult: PlanResult,
  planner: PlannerService,
): Promise<{ result: PlanResult; timeOverrides: TimeOverride[] }> {
  try {
    let result = planner.generatePlan(input);
    const overrides = new Map<string, TimeOverride>();
    for (const command of commands) {
      result = planner.revalidateAndRecalculate({
        trip: input.trip,
        allPois: input.selectedPois,
        current: result,
        command,
        fxRates: input.fxRates,
        timeOverrides: [...overrides.values()],
      });
      applyOverride(overrides, command);
    }
    if (!isDeepStrictEqual(result, expectedResult)) {
      throw new ItineraryError(
        422,
        'VALIDATION_ERROR',
        '候选日程与 C 的命令重放结果不一致。',
        { fields: [{ path: 'candidate.result', reason: '命令重放结果不一致' }] },
      );
    }
    return { result, timeOverrides: [...overrides.values()] };
  } catch (error) {
    if (error instanceof ItineraryError) throw error;
    throw new ItineraryError(422, 'VALIDATION_ERROR', '候选日程无法通过规划校验。', {
      fields: [{ path: 'candidate', reason: error instanceof Error ? error.message : '规划校验失败' }],
    });
  }
}

export function replaySavedEdit(
  input: PlannerInput,
  current: PlanResult,
  command: EditCommand,
  timeOverrides: TimeOverride[],
  planner: PlannerService,
): { result: PlanResult; timeOverrides: TimeOverride[] } {
  try {
    const overrides = new Map(timeOverrides.map((item) => [item.stopId, { ...item }]));
    const result = planner.revalidateAndRecalculate({
      trip: input.trip,
      allPois: input.selectedPois,
      current,
      command,
      fxRates: input.fxRates,
      timeOverrides: [...overrides.values()],
    });
    applyOverride(overrides, command);
    return { result, timeOverrides: [...overrides.values()] };
  } catch (error) {
    if (error instanceof ItineraryError) throw error;
    throw new ItineraryError(422, 'VALIDATION_ERROR', '行程编辑无法通过规划校验。', {
      fields: [{ path: 'command', reason: error instanceof Error ? error.message : '规划校验失败' }],
    });
  }
}

export function prepareNewCandidate(candidate: CandidatePlan): boolean {
  return candidate.commands.length === 0;
}
