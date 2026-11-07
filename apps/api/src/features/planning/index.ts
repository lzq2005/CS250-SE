import type { PlannerService } from '@tripmate/contracts';
import { generatePlan } from './generate.js';
import { revalidateAndRecalculate } from './recalculate.js';

export { generatePlan, revalidateAndRecalculate };

export const plannerService: PlannerService = { generatePlan, revalidateAndRecalculate };
