import assert from "node:assert/strict";
import fs from "node:fs";
import {
  envFlag,
  isPermanentPushFailure,
  shapePushPayload,
  validatePushSubscription,
} from "../src/lib/pushValidation";
import { supportsPushPrompt } from "../src/lib/pushClientSupport";
import { endpointFilter, pushSubscriptionRow } from "../src/lib/pushStoreRequest";
import { PUSH_PROMPT_ENGAGEMENT_DELAY_MS } from "../src/config/pushPrompt";

const valid = validatePushSubscription({
  endpoint: "https://push.example.test/subscription/1",
  keys: { p256dh: "public-key", auth: "auth-secret" },
});
assert.ok(valid);
assert.deepEqual(valid.preferences, { dailyBrief: false, matchAlerts: true, fullTimeResults: true });
assert.equal(validatePushSubscription({ endpoint: "http://unsafe.test", keys: {} }), null);

const row = pushSubscriptionRow(valid, { userAgent: "Browser", platform: "Android" });
assert.equal(row.endpoint, valid.endpoint);
assert.equal(row.notification_match_alerts, true);
assert.equal(row.notification_daily_brief, false);
assert.equal(endpointFilter(valid.endpoint), "endpoint=eq.https%3A%2F%2Fpush.example.test%2Fsubscription%2F1");

assert.equal(envFlag("true"), true);
assert.equal(envFlag("TRUE"), true);
assert.equal(envFlag(undefined), false);
assert.equal(envFlag("false"), false);
assert.equal(PUSH_PROMPT_ENGAGEMENT_DELAY_MS, 25_000);
assert.equal(isPermanentPushFailure(404), true);
assert.equal(isPermanentPushFailure(410), true);
assert.equal(isPermanentPushFailure(500), false);

assert.equal(supportsPushPrompt({ hasServiceWorker: true, hasPushManager: true, hasNotification: true, isIos: true, isStandalone: false }), false);
assert.equal(supportsPushPrompt({ hasServiceWorker: true, hasPushManager: true, hasNotification: true, isIos: true, isStandalone: true }), true);
assert.equal(supportsPushPrompt({ hasServiceWorker: false, hasPushManager: true, hasNotification: true, isIos: false, isStandalone: false }), false);

assert.deepEqual(shapePushPayload({ title: "Test", body: "Safe", destinationUrl: "https://evil.test", icon: "https://evil.test/icon", tag: "test" }), {
  title: "Test", body: "Safe", destinationUrl: "/", icon: "/images/favicon.png", tag: "test",
});

const migration = fs.readFileSync("supabase/migrations/006_push_notifications.sql", "utf8");
assert.match(migration, /unique \(event_type, fixture_id\)/);
assert.match(migration, /endpoint text not null unique/);
assert.match(migration, /enable row level security/);

console.log("push foundation tests passed");
