# Profile image persistence and owner isolation

The profile hero previously initialized its avatar only from the sign-in snapshot.
After an upload, reload could restore the old URL although the owned career API
returned the current image. The profile's state also survived a same-role account
change, showing the previous owner's bio while the new identity was displayed.

The outer profile component now keys its stateful content by user ID. Switching
identity unmounts old local state and its asynchronous response targets. The inner
component reads the authoritative career avatar; an explicit null clears the
image, with snapshot fallback only when the career profile itself is unavailable.
No auth-token/session-storage writes or API/schema changes are introduced.

Owned reads settle as one cohort and successful sections are applied independently,
so a failed dashboard cannot hide a successful avatar/cover/profile read. Failure
still produces the existing error alert. Both picture controls remain disabled
through initial loading, preventing the initial snapshot from overwriting a new
upload completed before a slow sibling request finishes.

Behavior-first Chromium regressions reproduced the stale avatar after upload/reload,
prior-owner bio after a natural cross-tab storage event, enabled picture controls
during a held load and a stale avatar when dashboard failed. Corrected cases cover
upload/reload, authoritative null, slow/failed sibling and owner isolation.
All24 account scenarios (three roles/seven widths plus three new regressions) and
production build passed locally. Scoped review found the loading/failure cases;
second review found no further substantive issue. Cross-model CLI was skipped in
this autonomous context. CI/deployment/deployed-fixture checks remain pending.

These upload cases use intercepted API/image fixtures. They do not claim actual
replacement/deletion of production avatar or cover assets, nor immediate refresh
of global header metadata. The original GDS audit retains those evidence limits.
