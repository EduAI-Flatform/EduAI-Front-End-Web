# GDS accessibility corrections

Support detail and affiliate history filters now include their visible localized
labels in accessible names. Header links have a minimum24px target size. Shared
Modal restores focus to external openers after close, while preserving native
Radix triggers, nested dialogs and expanded-combobox Escape behavior. Removed,
disabled or hidden targets are skipped and newer dialogs retain focus.

Regressions reproduced before changes. Fourteen Chromium cases cover VI/EN at
320,375,390,412,768,1024,1440px, including Tab/Shift-Tab containment and
Escape/Cancel/Close restoration. Independent review checked installed Radix
composition and found no actionable issues. The combined working tree passed
154 Vitest files/695 tests, TypeScript and build; the existing chunk advisory remains.

Artifact-only axe audit covers14 surfaces, two locales and seven widths:
196 cases, zero determinate violations after fixes, zero fixture gaps/overflow/
runtime errors or business writes. There are186 cases with incomplete outcomes;
this is not a complete accessibility certification. Separate manual evidence
includes330 sampled contrast nodes (315 conservative bounds at least4.8019:1),
profile button raster samples at least5.0433:1, brand preview samples at least
15.0857:1 and ordinary-viewport navigation hit testing. Those scoped samples do
not dispose every incomplete result. Empty-widget decoration pixels are not
accepted as text-contrast evidence.

Synthetic API fixtures and isolated artifact tooling add no product dependency,
production data write or provider activation. Remaining manual dispositions and
exact release receipts belong in the Workspace completion audit before the full
GDS plan can be marked complete.
