# System labels, locale changes and filter state

Persisted job, voucher, billing and card-evaluation enums now use VI/EN labels.
Classroom and instructor date displays format inside locale-subscribed render
boundaries rather than retaining the locale at module import. User-authored text,
stored amounts, currencies and API status values are unchanged.

Changing a Billing status/start/end filter resets the page to1, avoiding a false
empty result when an earlier page number no longer exists. Escape in the mobile
More menu restores keyboard focus to its disclosure button.

Card-policy previews accept the additive prior evaluation and comparison counts.
An invalid current source is visible alongside the candidate result; older API
responses still render without the new optional fields. Backend work is tracked
in `card-impact-prior-exceptions.md` in the sibling backend repository.

Focused regressions failed before their fixes. The initial25 tests across8 files,
build and seven fixture-only Chromium widths passed; an additional impact test
covers prior-side exceptions and counts. Browser fixtures intercept API data and
reject writes. No production policy or user data was changed. Independent review
found no substantive issue in the locale/filter/focus changes or the additive
prior-evaluation consumer. Final local verification passed149 Vitest files /
649 tests, production build and all7 browser scenarios using the checked-in GDS
CI configuration. The new browser suite is included in that CI configuration.
