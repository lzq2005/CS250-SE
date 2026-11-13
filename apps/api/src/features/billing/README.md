# billing

Owner: A. A-06 supplies a backend-only, read-only reference FX adapter:

```ts
import { referenceFx } from './reference-fx.js';
const fxRates = referenceFx.readRates(); // FxRate[] for PlannerInput
const rate = referenceFx.findRate('HKD', 'MOP'); // FxRate | null
```

No reference rate is approved at this baseline: `readRates()` returns `[]`, and
`findRate()` returns `null`. These mean unavailable, never a zero or default rate.
Only explicit cross-currency directions are supplied; same-currency costs need no FX.
An `asOf: null` reference must be labeled **Static reference** by its consumer.

`reference-fx-data.ts` is the reviewed application data source. Add values only
with traceable source and leader approval evidence in the same PR. The factory
`createReferenceFxAdapter` validates trusted static data and synthetic unit tests;
it is not an approval mechanism and must not receive client/provider payloads.
Invalid data throws `ReferenceFxDataError` before an adapter is exposed.

No HTTP endpoint, money conversion, planner algorithm, expense or settlement
implementation is included. Integration rules, tests and outstanding approvals:
[A-06 handoff](../../../../../docs/engineering/A-06-fx-budget.md).
