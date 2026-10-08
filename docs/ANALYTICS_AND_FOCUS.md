# Review analytics and focus tracking — phase two

## Implemented
- Review ranges: today, 7/30/90 days, one year, three years, and custom dates.
- Daily ledger, goal/project focus distributions, focus heatmap, average session, completed-task counts, and CSV export.
- Planned capacity separates reserved buffer, recorded focus, unused capacity, and overtime. Days without confirmed plans are unknown, never assumed to have 240 available minutes.
- Persistent cross-page focus dock with seconds, 15/25/50/90-minute starts, pause, resume, and 15-minute extensions up to a three-hour session maximum.
- Server timestamps remain authoritative across reloads. Recording stops at the session deadline even if the browser closes. Paused periods are excluded.
- Session corrections can trim accidental time; optimistic versions prevent overwriting another tab and activity records preserve the correction reason.
- Project, goal and task labels are captured with each session. Deleting or reassigning a task no longer destroys or reattributes its recorded focus.
- Scrollable activity timeline and session history, plus past reflections.

## Metric definitions
Recorded focus is elapsed session time, capped by the chosen deadline. It is not device activity or proof of attention.
Unused time is max(confirmed capacity after buffer - recorded focus, 0), calculated separately for each planned day.
Overtime is the converse. Today's unused time remains provisional.
Utilization includes only days with confirmed capacity; unplanned focus remains in focus totals.
Completions count distinct task IDs with a recorded completion event within the period, even if subsequently reopened. Daily rows may count a task on separate days.
Daily exports retain decimal minutes. UI totals are rounded for readability; sub-minute sessions are accumulated before rounding.
Session boundaries are split using the workspace timezone, including daylight-saving days. Changing timezone reinterprets date boundaries.

## Historical data
Three-year reporting supports recorded history; it cannot recreate time that was never tracked. No retention deletion is introduced.
Existing focus records are retained and labeled legacy because their project/goal labels can only be recovered at upgrade time.
Existing plan values remain stored, but capacity reporting starts when availability is explicitly confirmed in this release. Earlier reflection-only or carry-forward records cannot be distinguished reliably from explicit plans.
The timeline shows the newest 500 events and session history the newest 100 matching entries. Totals cover the entire selected range; narrower dates expose older details.

## Research
- [Toggl time audits](https://support.toggl.com/en-us/article/time-audits-lxl8zi/) supports surfacing unallocated and missing tracked time.
- [Toggl pause behavior](https://support.toggl.com/en-us/article/does-toggl-have-a-pause-feature-14v5mtu/) informed separate pause/resume segments.
- [RescueTime goal reports](https://help.rescuetime.com/article/462-the-goals-report) informed time allocation by goal.
- [RescueTime understanding data](https://help.rescuetime.com/article/461-understanding-your-data) informed avoiding a simplistic productivity score.

## Release checks
Verified: 43 unit/database tests, 3 desktop/mobile browser scenarios, lint, TypeScript and production build. Both migrations were rehearsed against a fresh full production snapshot, preserving all original fields in 10 application tables. Apply migrations 202610080001_analytics and 202610080002_confirmed_capacity before deploying the application. Back up the production database first.
