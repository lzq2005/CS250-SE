import type { PlanResult } from '@tripmate/contracts';
import { d01FixturePlan } from './d01-fixture';

const firstDay = d01FixturePlan.days[0]!;
const secondDay = d01FixturePlan.days[1]!;

// Deliberately invalid ordering and missing leg data for defensive-display tests.
export const d01LegBoundaryPlan: PlanResult = {
  ...d01FixturePlan,
  days: [
    {
      ...firstDay,
      legs: [...firstDay.legs].reverse(),
    },
    {
      ...secondDay,
      legs: [],
    },
  ],
};
