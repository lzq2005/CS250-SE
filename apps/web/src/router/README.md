# B-01 Shell navigation

Shell-only hash navigation adds no dependencies. URLs: `#/home`, `#/discover`,
`#/map`, `#/mine`, `#/trip`, `#/favorites`, `#/trips`, `#/plaza`.
Refresh/history preserve the destination; unknown addresses show a recovery page.
All feature destinations explicitly say development is in progress. No empty
favorites, saved trips, POIs or business operations are fabricated.

A owns Trip, C generation, D itinerary/map, B discovery and Plaza reading.
When approved feature pages land on main, B coordinates lazy component imports
here instead of duplicating features. D's unmerged ItineraryDisplay is not imported.
Frontend shell route choices do not change HTTP APIs or shared DTOs.

B-owned browser checks (from repo root, after installing Playwright Chromium):
`npx playwright test -c apps/web/src/router/playwright.config.ts`.
This configuration also runs the unchanged bootstrap health E2E tests.
For an installed Chrome, set `TRIPMATE_BROWSER_CHANNEL=chrome` before running;
otherwise the default is Playwright Chromium. No personal browser profile is used.
Tests cover every tab/shortcut, honest placeholders, reload/history, unknown paths,
keyboard focus and horizontal overflow at 320/390/768 px. These tests require the
normal initialized local DB and existing web/API dev commands; no fake business API.

App.vue composes the shell. shared/ui contains decorative icons. styles/shell.css
contains responsive tokens/styles. Existing health feedback remains visible under
the service connection section. B-01 changes no backend files or dependencies.

## B-01 validation 2026-11-04

- `npm run lint`, `npm run typecheck`, `npm test` (5 tests), `npm run build`: passed.
- B-owned Playwright config above: 4 passed using installed Chrome (two shell
  navigation/mobile checks plus the unchanged two bootstrap health checks).
- Desktop and mobile layouts visually reviewed. All feature destinations remain
  development placeholders. No POI, favorite, target or publishing backend is implemented.
- The existing root CI runs bootstrap E2E only. Run this B-owned config explicitly
  to reproduce the added shell checks; its CI registration remains for A/D review.
- [Home mobile preview](previews/home-mobile.png)
- [Discover desktop preview](previews/discover-desktop.png)

Manual check: open Home, try all four shortcuts and tabs, reload a destination,
use Back/Forward, visit an unknown hash, and verify recovery. In a narrow window,
scroll to the bottom and check that all content stays reachable above the fixed nav.
