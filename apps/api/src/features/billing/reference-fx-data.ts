import type { FxRate } from '@tripmate/contracts';

// No approved reference rates were found at the A-06 baseline (d9adfd8).
// Keep empty until the leader approves exact directions/values and provenance.
// Record approval evidence in docs/engineering/A-06-fx-budget.md in the same PR.
// Never add synthetic test rates, live-provider defaults or inferred inverses here.
export const approvedReferenceFxRates: readonly FxRate[] = Object.freeze([]);
