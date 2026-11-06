import type { CandidatePlan, DraftEditRequest } from '@tripmate/contracts';
import type { CandidateEditorAdapter } from './editorAdapter';

type MockOptions = {
  delayMs?: number;
  failMessage?: string;
};

export type D03TestAdapter = CandidateEditorAdapter & {
  requests: DraftEditRequest[];
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function createD03TestAdapter(options: MockOptions = {}): D03TestAdapter {
  const requests: DraftEditRequest[] = [];

  return {
    requests,
    async editDraft(request: DraftEditRequest): Promise<CandidatePlan> {
      if (options.delayMs) await wait(options.delayMs);
      if (options.failMessage) throw new Error(options.failMessage);

      requests.push(clone(request));
      const updated = clone(request.candidate);
      const command = request.command;

      if (command.type === 'setVisitTime') {
        for (const day of updated.result.days) {
          const stop = day.stops.find((item) => item.id === command.stopId);
          if (stop) {
            stop.start = command.start;
            stop.end = command.end;
            break;
          }
        }
      }

      if (command.type === 'setTransportMode') {
        const day = updated.result.days.find((item) => item.date === command.date);
        const leg = day?.legs.find((item) => item.toPoiId === command.toPoiId);
        if (leg) leg.mode = command.mode;
      }

      if (command.type === 'removeStop') {
        if (command.confirmed !== true) throw new Error('Stop removal must be confirmed');
        const day = updated.result.days.find((item) =>
          item.stops.some((stop) => stop.id === command.stopId),
        );
        const stop = day?.stops.find((item) => item.id === command.stopId);
        if (!day || !stop) throw new Error('Edit refers to a missing stop');
        day.stops = day.stops.filter((item) => item.id !== stop.id);
        day.legs = day.legs.filter((leg) => leg.toPoiId !== stop.poiId);
        updated.result.unscheduled.push({
          poiId: stop.poiId,
          reason: 'USER_REMOVED',
          code: 'UNSCHEDULED',
        });
      }

      updated.commands.push(clone(command));
      return updated;
    },
  };
}
