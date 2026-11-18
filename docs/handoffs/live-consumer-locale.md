# Live locale consumers and assignment sizing

Call-time formatters replace module-level Intl instances in mentor bookings,
student/instructor assignments and Admin overview. Six booking statuses and all
five first-party operational signals now follow VI/EN changes. Authored content,
canonical enums/action payloads and dateTime values remain unchanged.

Five new unit regressions failed before the fix. The combined source tree passed
154 files/695 Vitest tests; focused locale/existing suites passed21 tests and
TypeScript passed. Independent source review found no actionable issues.

The registered browser suite covers five routes at seven required widths,
VI -> EN -> VI, all statuses/start/end/due dates and Admin number/signal details.
The standalone submission page receives the preference from a real second tab,
exercising the existing storage listener without adding a fake selector.

Browser checks exposed real form overflow: a218px intrinsic score input exceeded
a160px instructor column; a student's mobile1fr track expanded to437.6px.
Bounded input sizing and minmax(0,1fr) fix the cause without clipping content.
All35 final Chromium cases passed with no overflow, runtime errors, unknown API
requests or business writes. Fixtures use synthetic data and an isolated server
with no.env. Production deployment and shipped-code checks remain release gates.
