# Remaining reward, scholarship and work-mode labels

Visible reward/ledger, scholarship campaign/application and job work-mode codes now
use shared VI/EN labels with safe unknown fallbacks. Authored names, descriptions,
locations and IDs remain untouched, even when their text matches a system label.
Amounts, status values, requests and historical records do not change.

Consumer regressions reproduced raw codes before the fixes, including additional
reward-kind/status cases. Final152 Vitest files /682 tests and production build
passed. Independent review found no substantive issue. Three registered synthetic
Chromium scenarios cover live locale switching and UGC preservation; all affected
views sweep320/375/390/412/768/1024/1440px without document overflow, API writes or
page errors. These are intercepted fixtures, not production data changes.
