# Affiliate summary and wallet history export

Five summary slots complete the current Dashboard presentation: referred net
revenue, this month's/today's recorded commission, ranking policy state and
sub-affiliate policy state. Existing referral count, lifetime commission and actual
wallet balance stay separate. New values use exact signed BigInt and explicit UTC
snapshot/window metadata; old servers or unavailable/incomplete sources never
produce fabricated zero. Ranking functionality is not invented by a null state.

Wallet history exports the entire selected filter through its authenticated GET
endpoint, not just loaded pages. The UI checks completeness/scope/filter, uses a
local XLSX filename and releases its object URL. Limit errors preserve history;
late responses after unmount/disable cannot start a download. No payout, balance
calculation, reconciliation or authored-data translation is added.

Regression-first unit tests cover precision, negative amounts, real zero,
unavailable sources, filter selection, rejected/partial exports and late responses.
The combined tree passed157 Vitest files/709 tests, TypeScript and build. Summary
browser acceptance plus14 download/focus cases cover VI/EN and seven widths with
synthetic GET fixtures and zero business writes/errors/overflow. Browser download
payload is synthetic; backend workbook/native SQL checks prove source/file format.
Independent source review found no actionable issues.

Backend PR66 must pass native PostgreSQL CI and deploy before this frontend
release. Neither source checks nor fixtures activate financial policies, ranking
rules, sub-affiliates or real bank transfers. Main/deployment/shipped-code checks
and temporary-branch cleanup remain release gates.
