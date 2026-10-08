# Boardo — your day, with intention

Boardo is a private, single-owner daily assistant. It connects tasks to personal goals and chosen outcomes, recommends a feasible next action, records focus and feedback, and helps close the day with a reflection.

## What is implemented

- Private password login with hashed credentials, revocable database sessions, secure production cookies, durable login throttling and same-origin write checks.
- Owner-scoped projects, goals, tasks and daily history. Legacy records stay inaccessible until explicitly assigned to the configured owner.
- Today: up to three outcomes, chosen tasks, available minutes, energy, context and a buffer.
- Deterministic next-action recommendations with factual reasons and two alternatives.
- A capacity-limited suggested sequence, manual pins and overload warnings.
- Start, pause, complete, defer, block, unblock, reopen and create a smaller prerequisite step.
- One active focus session per owner; daily focus totals use the selected timezone.
- Task estimates, goal links, notes, date-only deadlines and a prerequisite with cycle detection.
- Atomic Kanban ordering, keyboard dragging and explicit status controls.
- Daily reflection and explicit carry-forward into tomorrow's chosen tasks.
- Escaped daily brief, authenticated GET cron, persisted payload, delivery status and provider idempotency.
- Validation, safe API errors, noninteractive lint, unit/integration/browser checks and CI.

This release implements the foundation and the first daily-assistant workflow (Phases 0 and 1). Calendar synchronization, natural-language AI capture, predictive learning and autonomous external actions are later phases. Recommendations currently use explicit input and recorded activity.

## Local setup

Use Node.js 22 (minimum 20.9) and PostgreSQL 17 or newer.

1. Run `npm ci`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `BOARDO_OWNER_EMAIL`, and `APP_URL`.
3. Run `npm run auth:password`. Input is hidden. Save the generated value as `BOARDO_PASSWORD_HASH` in your private environment.
4. Run `npm run db:deploy`.
5. Run `npm run setup:owner`. For an upgrade, review the number of unowned projects and run `npm run setup:owner -- --claim-existing` to assign those records to this account.
6. Run `npm run dev` and open [Boardo locally](http://localhost:3000).

No public registration is provided. Changing the password hash invalidates existing sessions. Changing the owner email does not transfer another account's records. Keep the owner email stable unless performing an intentional data migration.

Optional local seed: set `ALLOW_DEVELOPMENT_SEED=true` and run `npm run db:seed`. It only accepts localhost databases, preserves existing projects, and never deletes data.

## Using your daily assistant

1. Create a project and an optional longer-term goal.
2. Capture concrete tasks with realistic estimates. Mark prerequisites or blockers.
3. On Today, choose one to three outcomes and the tasks that support them.
4. Enter total available work minutes for the day, energy, context and a buffer.
5. Start the recommendation or choose an alternative. Pause when interrupted.
6. Mark completion, defer work or record what is blocking it. Use “Too big” to create a concrete 15-minute prerequisite.
7. Pin work you want to keep in the suggested sequence. Over-capacity pins are visible instead of silently discarded.
8. Save a reflection in Review; select unfinished tasks to carry forward explicitly.

Focus time is elapsed time between Start and Pause/Done; the app does not monitor your computer. A session remains active until you stop it, including after reload. Recommendations use manual availability, not calendar knowledge. Estimates are defaults that you can edit.

## Upgrade and deployment

Use the additive migration in `prisma/migrations/202610060001_personal_assistant`. It preserves task/project IDs and due dates. Existing projects receive a nullable owner field and stay private until claimed. Historical completed tasks are not assigned invented completion timestamps.

Before production rollout:

1. Back up PostgreSQL and rehearse the migration/claim on a copy.
2. Configure `DATABASE_URL`, `BOARDO_OWNER_EMAIL`, `BOARDO_PASSWORD_HASH`, and the exact HTTPS `APP_URL` in the hosting environment.
3. Run `npm run db:deploy` and the owner setup/claim command against the intended database.
4. Deploy with `npm run build`; start with `npm run start` outside Vercel.
5. Verify anonymous API requests return 401, login works, existing records are assigned correctly, a task move preserves its deadline and the Today flow works.
6. Enable email only after the separate delivery configuration is ready.

Do not use `prisma db push` to bypass migration history in production. The partial unique focus-session index and database checks are provided by the SQL migration.

### Email

Set `RESEND_API_KEY`, a verified `RESEND_FROM`, `DIGEST_EMAIL` and a random `CRON_SECRET`. The configured schedule in `vercel.json` is 01:30 UTC / 07:00 India. Change it to your preferred briefing time; Vercel cron schedules are UTC.

The handler accepts GET/POST only with `Authorization: Bearer <CRON_SECRET>`. Missing secrets fail closed. A run is unique per owner/local date. Concurrent invocations are locked, retries use the same persisted payload and provider idempotency key, and rejected deliveries are recorded as failed. An uncertain delivery older than 23 hours requires reconciliation rather than a blind retry because the provider's idempotency window is finite. Provider acceptance is recorded; inbox delivery is not claimed.

## Checks

- `npm run lint`
- `npm run typecheck`
- `npm test` — planner, validation and email regressions; database tests skip unless configured.
- `npm run build`
- `npm run test:e2e` — authenticated browser flow and anonymous-access checks.

For database and browser checks, provide `BOARDO_TEST_DATABASE_URL` pointing to an isolated database ending in `_test`. Apply migrations to that database first. Integration tests refuse nonlocal hosts except the CI service named `postgres`.

The browser test starts its own development server on port 3100 with synthetic credentials; it does not use your production password or email service. Run `npx playwright install chromium` once. CI uses a disposable PostgreSQL service and exercises the same checks.

## Structure

- `lib/auth.ts`, `lib/api.ts`, `lib/http.ts`: private access and request boundary.
- `lib/tasks.ts`: owner-scoped mutations, row locks, version checks, ordering and focus transitions.
- `lib/planner.ts`: pure eligibility, ranking, capacity and timezone logic.
- `lib/today.ts`: daily context and progress projection.
- `lib/validation.ts`: shared input contracts.
- `app/api`: thin validated API handlers.
- `components/TodayClient.tsx`: daily briefing, recommendation and plan.
- `tests`: regression scenarios and browser flow.
- `RELEASE_NOTES.md`: implementation verification and rollout status.

The original audit documents describe the pre-implementation revision and remain historical references.

## Review analytics and focus controls
See [the analytics guide](docs/ANALYTICS_AND_FOCUS.md) for three-year reports, timer controls, metric definitions and historical-data limitations.
