import type { CandidatePlan, PlannerInput, TripConfig } from '@tripmate/contracts';
import { d01FixturePlan, d01FixturePois } from './d01-fixture';

const trip: TripConfig = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: '澳门两日文化行',
  startDate: '2026-11-03',
  endDate: '2026-11-04',
  origin: {
    label: '大三巴牌坊',
    position: { lat: 22.1975, lng: 113.5408 },
    source: 'curated',
  },
  dayWindows: [
    { date: '2026-11-03', start: '09:00', end: '18:00' },
    { date: '2026-11-04', start: '09:00', end: '18:00' },
  ],
  interests: ['history'],
  budget: { amountMinor: 50000, currency: 'MOP' },
  pace: 'standard',
};

export const d03FixtureInput: PlannerInput = {
  trip,
  selectedPois: d01FixturePois,
  defaultTravelMode: 'walk',
  fxRates: [],
};

export const d03FixtureCandidate: CandidatePlan = {
  input: d03FixtureInput,
  result: d01FixturePlan,
  commands: [],
};
