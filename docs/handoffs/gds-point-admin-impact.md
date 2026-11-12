# GDS Admin point impact

Adds point policy impact to the existing reviewed platform configuration surface; no new page or visual redesign.

- VI/EN shows the recent-activity sample, changed learners/events, hypothetical point totals, date range and before/after policy revision IDs.
- Explicitly distinguishes simulation from future issuance and preserves historic awards, original validity and purchased course access.
- An empty sample is explained. `limit_exceeded` never displays null totals as zero or a complete projection.
- Point activity selection uses the supported `course.completed` adapter, with an explicit disabled option for unsupported stored codes. Backend validation remains authoritative.
- `pointsImpact` and capability metadata are additive optional contracts, so existing backend responses remain readable.

Verified locally: full frontend suite (132 files, 584 tests), TypeScript/Vite build, and two Chromium platform scenarios including point configuration/preview in VI/EN at 320, 375, 390, 412, 768, 1024 and 1440 px. Reviewed 390/1440 point-panel screenshots. Browser APIs were synthetic fixtures; these checks do not establish authenticated production acceptance.

Backend point lifecycle remains on draft PR 36 and requires its reviewed schema migration before runtime deployment. This frontend change does not enable a point policy, alter historical awards or apply any production migration.
