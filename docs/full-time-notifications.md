# Full-Time notification readiness

Implemented locally; sending remains disabled. Do not enable Production until the migration, scheduler plan and matching verification below are satisfied.

## Audit

Already present: the official men's fixture parser and six-hour cached list; server-only Footballdata.io bearer client with an eight-second timeout; global/Full-Time flags; `notification_full_time`; active subscription storage; Web Push/VAPID delivery and expiry handling; admin authentication; native cron bearer authentication; and the database uniqueness constraint `(event_type, fixture_id)` from migration 006. The shared service worker already validates same-origin destinations and reuses/navigates windows.

Missing before this change: a match-window monitor, trustworthy fixture/result matching, a Full-Time cron, subscriber selection and event reservation for Full-Time, diagnostics, a dedicated single-device test, Full-Time click tracking, and persistent monitoring/dispatch observability. `getNextFixture()` only returns future fixtures, so calling it after kickoff loses the active match.

The monitor now uses the **same cached official fixture list**, without changing `getNextFixture()` or the popup, and retains the selected official fixture in Supabase across invocations. No second fixture ingestion system was added. The existing Daily Brief implementation, cron times and click flow are unchanged.

## Provider and live findings

The initial lookup uses:

```text
GET https://footballdata.io/api/v1/teams/193/matches?league_id=15&from=OFFICIAL-DATE-MINUS-2-DAYS&to=OFFICIAL-DATE-PLUS-2-DAYS&limit=100
```

After a unique positive match, subsequent checks use:

```text
GET https://footballdata.io/api/v1/matches/{providerFixtureId}
```

Both reuse the existing authenticated, server-only client. Discovery uses `date_unix`, not the timezone-less `match_date` string, within **±2 UTC calendar days** of the official date (inclusive full days, not a rolling 48-hour tolerance). Date proximity alone is insufficient: Leeds public ID 193 must be on the official side, the opponent name must match exactly after conservative normalization, league must be 15 and season year 20262027. HTML entities, punctuation, FC/AFC tokens and the explicit Leeds/Leeds United alias are normalized; no fuzzy club matching is used. The official feed has no opponent provider-ID mapping, so the first exact match supplies a positive opponent ID which is then retained and checked on later responses.

A unique match binds the official fixture to the provider ID using the existing `fixture`, `provider_fixture_id` and `last_provider_observation` JSON state from migration 009. Later runs request that ID directly and verify identity/season/competition. Further provider schedule changes do not discard the binding or move the monitoring window. An identity/ID mismatch fails closed and retains the binding for inspection; it never silently selects a different fixture mid-match. No migration is needed for this matching update.

**Stale-result guard:** a displaced kickoff with status already `complete` cannot prove freshness on first observation. Such a result is rejected with `unverified_drifted_complete` unless this same bound fixture was previously observed `incomplete` during the official monitoring window. The observation time is retained across subsequent statuses. This prevents the wider discovery range from becoming permission to send historical results. Missing a non-complete observation means a drifted result is deliberately not sent. Exact-time results continue to use the existing completion and score gates. Only Premier League fixtures are supported; cups and unknown competitions fail closed.

Two read-only provider calls during the 2026-09-08 audit confirmed the list/detail response shapes. The account reported a free allowance of **2,000 requests/month**. No notification was sent.

**Observed provider schedule drift:** the official source lists Leeds–Newcastle at **2026-09-14 19:00 UTC** and Leeds–Palace at **2026-09-20 13:00 UTC**. The provider currently lists **2026-09-12 14:00 UTC** and **2026-09-19 14:00 UTC** respectively. These discrepancies are now regression cases: incomplete records with exact identity match despite the −53-hour/−23-hour differences. Official kickoff remains authoritative. A complete result still needs the freshness evidence described above; the dates alone never authorize sending.

References: [provider team endpoints](https://footballdata.io/documentation/teams/), [provider match endpoints](https://footballdata.io/documentation/matches/).

## Scheduling and API budget

`vercel.json` adds `GET /api/cron/full-time-monitor` at `*/3 * * * *`. Existing Daily Brief cron entries are preserved. `CRON_SECRET` must be configured; missing or incorrect bearer credentials return 401 before evaluation. No alternate authentication bypass exists.

The provider is checked only from **15 minutes before kickoff through three hours after kickoff**, inclusive. Temporary delays, stoppage time and provider lag are accommodated throughout that window. An exact provider `complete` is required; elapsed time never implies Full Time. Completion before the known kickoff is rejected. Final scores must be finite nonnegative integers (maximum 100).

Outside the window, the route performs lightweight cached-fixture/state work and makes **zero provider calls**. Scheduled invocations also make zero provider calls while either sending flag is false, when no eligible subscribers exist, or after a matched event has been reserved. A database polling gate prevents invocations less than 150 seconds apart from both calling the provider. Admin dry-runs are read-only and intentionally do not claim that gate; each in-window diagnostic can consume one additional provider request.

The 195-minute window permits at most approximately **66 calls per fixture** at three-minute cadence, usually about 40–45 when the provider promptly reports completion. Four to eight monitored league matches would use at most approximately **264–528 calls/month**, plus manual diagnostics and other users of the provider key. The recurring cron itself invokes roughly 14,400 times per 30-day month; most invocations do not contact Footballdata.io.

**Vercel plan remains unverified:** this workspace has no linked Vercel account/plan metadata. The configured three-minute schedule requires **Pro or Enterprise**. [Vercel documents](https://vercel.com/docs/cron-jobs/usage-and-pricing) Hobby as daily-only with hourly timing precision; it cannot deliver this near-live monitor reliably. Do not deploy this cron configuration on Hobby. Confirm/upgrade the plan first, or arrange an authenticated external three-minute scheduler and remove the Vercel Full-Time cron entry. No external scheduler was provisioned. Cron execution and provider updates are not exact-time guarantees.

The cron declares a 300-second function limit, with a 220-second dispatch budget and eight-second Web Push request timeout for this flow only.

## Delivery and duplicates

Sending requires all of:

- A uniquely matched current official Leeds fixture inside its monitoring window.
- Exact `complete` status and valid home/away scores.
- No prior `full_time` event for `footballdata-io:{providerFixtureId}`.
- Active subscribers with `notification_full_time = true`.
- Both `LEEDSWIRE_PUSH_ENABLED=true` and `LEEDSWIRE_FULLTIME_PUSH_ENABLED=true`.

The sender inserts into the existing `push_notification_events` with `event_type=full_time` and the stable provider-based fixture identity. Database uniqueness and `ON CONFLICT ... DO NOTHING` semantics allow only the successful reservation owner to send, including concurrent invocations. Subscriptions are fetched in ordered batches of five, checked again for the Full-Time preference, and sent concurrently within each batch. Expired subscriptions use the existing sender's deactivation behavior.

This is **at-most-once dispatch**, not a guaranteed-delivery queue. A reserved event is never automatically broadcast again, even when all deliveries fail. Interrupted/budget-exhausted attempts can leave recipients unreached; `last_dispatch.unfinished` and stored progress expose this where execution can finish. An abrupt process termination can leave the last stored progress incomplete. Do not delete reserved events to retry a broadcast: that can duplicate notifications. A resumable per-recipient delivery ledger would be a separate reliability enhancement.

Payload:

```text
FULL TIME
{Home Team} {Home Score} - {Away Score} {Away Team}
```

The payload also contains `fixtureId`, a fixture-specific tag, the existing default icon, and the same-origin destination `/api/push/full-time/click?event={event UUID}`. No publisher destination, API key or subscriber data is included.

There is no internal match/result page. Clicking uses the existing service-worker window handling, records the Full-Time event click and redirects to the LeedsWire homepage `/`. Invalid/missing events and tracking failures also safely land on `/`. No new result UI or popup behavior was introduced.

## Observability and analytics

Migration 009 adds `push_full_time_status` with RLS and service-role-only access. It retains:

- `evaluation`: latest evaluated time, known fixture/identity, flags, window, duplicate/subscriber checks, `wouldSend`, safe skip reason.
- `fixture` and `provider_fixture_id`: current retained official context and matched provider identity.
- `last_poll_at`: shared provider polling gate.
- `last_provider_observation`: last matched provider status and validated score.
- `last_completed_match`: latest valid completed match detected.
- `last_dispatch`: last attempt time/event, attempted, successful, failed, expired and unfinished counts.

Skipped evaluations PATCH only evaluation/context fields. They **do not reset** the last observation, completed match or delivery totals. Dispatch progress is saved before delivery and after each batch, and aggregate counts are also written to the existing event row.

`full_time_push_dispatch` and `full_time_push_click` use the existing server-log event convention with safe fixture/result metadata. Clicks increment the event's database `click_count` once per valid tracking-route request. Homepage loads do not increment it. No duplicate GA4 event is added; these named events are server logs, not GA4 Measurement Protocol submissions. No endpoint, subscription ID, encryption material or credential appears in these analytics.

## Deployment prerequisites

1. Apply **`supabase/migrations/009_full_time_monitor.sql` before deployment**. It initializes the monitor singleton, polling RPC and Full-Time click RPC. It preserves all subscriptions/events and does not alter migrations 006–008. This task prepared the migration but did not apply it to Production.
2. Confirm a Vercel plan supporting the three-minute cron and 300-second function setting. Deploy the code/config only after that confirmation.
3. Retain existing server-only `FOOTBALLDATA_IO_KEY`, Supabase service-role configuration, VAPID configuration, `CRON_SECRET` and admin password. No new environment variable is required.
4. Keep **`LEEDSWIRE_FULLTIME_PUSH_ENABLED=false`** while diagnosing. The local value was verified false; no local or Production flag was changed. Production's value is based on the supplied task context, not a remote environment inspection.
5. Verify the official/provider identity binding during a known fixture window. Inspect matching diagnostics and completion freshness evidence before enabling.
6. Only after review and satisfactory device testing should the user enable Production by changing **only** `LEEDSWIRE_FULLTIME_PUSH_ENABLED=true`. Deployment and readiness checks must already be complete.

## Diagnostic and single-device procedures

Log in through the existing admin login. From the same-origin browser console:

```js
await fetch('/api/debug/push/full-time', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dryRun: true }),
}).then(r => r.json());
```

The route requires an existing admin session and literal `dryRun: true`; it cannot broadcast. It reports safe fixture/provider/status/score/window/duplicate/subscriber/flag information and stored observability. With the Full-Time flag false, `wouldSend` is false. Outside a window, provider details may be null with `outside_monitoring_window`; no historical result is substituted. Dry-run does not reserve events, send pushes, write monitor state or alter flags. The database migration must exist before using it.

The following separate test **sends one harmless notification**; it was not executed during this task. Replace the placeholder with one active, Full-Time-opted-in subscription UUID:

```js
await fetch('/api/debug/push/full-time/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true, subscriptionId: 'REPLACE-WITH-ONE-SUBSCRIPTION-UUID' }),
}).then(r => r.json());
```

It requires admin authentication, the global push flag, explicit `test: true`, and one valid UUID. There is no broadcast selector or default subscriber. It works while the real Full-Time flag remains false. Its fixed title is **LeedsWire Test**, body **Full-Time alerts are connected.**, and destination `/`. It never fabricates a match result or reserves a Full-Time event.

## Files and verification

New files:

- `src/lib/fullTime.ts`: identity, window, matching, scores, payload and test validation.
- `src/lib/fullTimeMonitor.ts`: injectable monitor/dispatch orchestration.
- `src/lib/fullTimeStore.ts`: targeted subscriber queries, event reservation and durable state.
- `src/lib/fullTimeService.ts`: production dependency wiring.
- `src/lib/fullTimeHttp.ts`: authenticated diagnostic/test/cron and click responses.
- `src/app/api/cron/full-time-monitor/route.ts`.
- `src/app/api/debug/push/full-time/route.ts`.
- `src/app/api/debug/push/full-time/test/route.ts`.
- `src/app/api/push/full-time/click/route.ts`.
- `supabase/migrations/009_full_time_monitor.sql`.
- `tests/full-time.test.ts`, `tests/full-time-adapters.test.ts`.
- This runbook.

Updated: `src/lib/fixtures.ts` (shared-list export only), `src/lib/footballDataIo.ts` (scoped match reads), `src/lib/pushService.ts` (optional timeout; existing callers unchanged), `vercel.json`, `package.json`, `tsconfig.test.json`.

Tests exercise one/two-calendar-day drift, bound-ID reuse, exact opponent/orientation matching, ambiguous candidates, stale completed results, historical data, the full window, completion/scores, duplicate and concurrent runs, disabled flags, target preferences, provider timeout/failure, repeated invocations, safe dry-run/test/auth/click behavior, state preservation, REST query shape and payloads. All automated provider/store/delivery calls are mocked; no real notification or broadcast is sent. The migration and physical device delivery still require verification in the deployed environment.

Local verification passed: `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npm run test`, and `git diff --check`. Existing Daily Brief tests also passed. Migration execution, Production environment inspection and physical device delivery were not performed.

## Matching diagnostics example

`POST /api/debug/push/full-time` with `{"dryRun":true}` now includes the following safe matching fields. This is the regression-fixture output for Palace, not a new live provider check:

```json
{
  "knownFixture": {
    "opponent": "Crystal Palace",
    "kickoffAt": "2026-09-20T13:00:00.000Z",
    "isHome": true,
    "competition": "Premier League"
  },
  "providerFixtureId": 905082997,
  "matching": {
    "providerCandidateCount": 1,
    "providerKickoffAt": "2026-09-19T14:00:00.000Z",
    "kickoffDifferenceHours": -23,
    "opponentMatched": true,
    "homeAwayMatched": true,
    "competitionMatched": true,
    "fixtureMatchStatus": "matched"
  },
  "providerStatus": "incomplete",
  "fullTimePushEnabled": false,
  "wouldSend": false,
  "skipReason": "match_not_complete"
}
```

`providerCandidateCount` counts candidates satisfying identity, season and discovery-date rules, before the completed-result freshness gate. `fixtureMatchStatus` is `matched`, `no_candidate`, `ambiguous` or `identity_mismatch`; `skipReason` provides the specific failure, including unverified completion. `matching` is null when no lookup was performed (for example outside the official window or disabled scheduled sending). Dry-runs remain read-only and do not persist a binding or observation.

Files changed by the fixture-matching follow-up: `src/lib/fullTime.ts`, `src/lib/fullTimeMonitor.ts`, `src/lib/footballDataIo.ts`, `tests/full-time.test.ts`, `tests/full-time-adapters.test.ts`, and this runbook. Migration 009 and all earlier migrations were left unchanged.
