# Daily Leeds Brief operations

The Daily Leeds Brief evaluates the same Top Story used by the homepage and, when enabled, sends it at approximately 11:30 in `Europe/London`.

## Required Vercel environment variables

- `LEEDSWIRE_PUSH_ENABLED=true` permits push delivery globally.
- `LEEDSWIRE_DAILY_BRIEF_PUSH_ENABLED=true` permits Daily Brief delivery.
- `CRON_SECRET` must be a random value of at least 16 characters. Native Vercel Cron sends it automatically as `Authorization: Bearer <value>`.
- Existing Supabase service-role and VAPID variables remain required.

Keep `LEEDSWIRE_DAILY_BRIEF_PUSH_ENABLED=false` until migration `007_daily_leeds_brief.sql` is applied and an intentional production launch is approved. The Full-Time flag is separate and remains disabled.

## Schedule and daylight saving

Vercel cron schedules are UTC. The route runs at 10:30 UTC and 11:30 UTC; the server accepts only 11:25–11:39 in `Europe/London`. One invocation is therefore accepted during BST and the other during GMT. Database uniqueness prevents more than one dispatch per UK date.

Minute-accurate delivery requires a Vercel plan with per-minute cron precision. Hobby cron invocations may occur anywhere within the scheduled hour, so the server will safely skip an invocation that lands outside the dispatch window rather than send at the wrong local time.

The Daily Brief route validates Vercel's reserved `CRON_SECRET`. A missing secret or missing/incorrect bearer header fails closed with HTTP 401.

## Safe dry run

With an authenticated LeedsWire admin session, send:

```http
POST /api/debug/push/daily-brief
Content-Type: application/json

{"dryRun":true}
```

The response contains the selected public story, its age and eligibility, duplicate state, eligible subscriber count, flags, local dispatch-window state, and whether a send would occur. It never returns subscription credentials or server secrets. This endpoint cannot broadcast.
