import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { dailyBriefClickResponse, dailyBriefClickUrl, resolveDailyBriefStory, type DailyBriefStory } from "../src/lib/dailyBriefClick";
import { hashCanonicalUrl } from "../src/lib/dailyBrief";
import { getArticleCtaUrl } from "../src/lib/articleUrls";

const id = "11111111-1111-4111-8111-111111111111";
const publisher = "https://www.leeds-live.co.uk/sport/leeds-united/story-123456";
const saved: DailyBriefStory = { article_id: `leeds-live-${publisher}`, headline: "Selected headline", source_id: "leeds-live", canonical_url: publisher, canonical_url_hash: hashCanonicalUrl(publisher) };
const origin = "https://leedswire.test";
const destination = origin + dailyBriefClickUrl(id);

async function main() {
  assert.equal(dailyBriefClickUrl(id), `/api/push/daily-brief/click?event=${id}`);
  assert.equal(dailyBriefClickUrl("bad&event=other"), "/");
  const fallback = resolveDailyBriefStory(saved, [])!;
  assert.equal(fallback.title, saved.headline);
  assert.equal(fallback.sourceId, saved.source_id);
  assert.equal(getArticleCtaUrl(fallback), publisher);
  assert.equal(fallback.publishedAt, ""); // Do not invent publication dates.
  const live = { ...fallback, standfirst: "Existing summary", imageUrl: "/image.png" };
  assert.equal(resolveDailyBriefStory(saved, [live]), live);
  assert.equal(resolveDailyBriefStory({ ...saved, article_id: "old-id" }, [live]), live);
  assert.equal(resolveDailyBriefStory({ ...saved, canonical_url: "javascript:alert(1)" }, []), null);
  let reads = 0;
  let clicks = 0;
  const dependencies = { getStory: async (event: string) => { reads++; assert.equal(event, id); return saved; }, recordClick: async () => { clicks++; } };
  const response = await dailyBriefClickResponse(new Request(destination), dependencies);
  assert.equal(response.headers.get("location"), `${origin}/?dailyBrief=${id}`);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(clicks, 1);
  await dailyBriefClickResponse(new Request(origin + "/?event=bad"), dependencies);
  assert.equal(reads, 1);
  assert.equal(clicks, 1);
  for (const getStory of [async () => null, async () => { throw Error("offline"); }]) {
    const result = await dailyBriefClickResponse(new Request(destination), { ...dependencies, getStory });
    assert.equal(result.headers.get("location"), origin + "/");
  }
  const trackingFailure = await dailyBriefClickResponse(new Request(destination), { ...dependencies, recordClick: async () => { throw Error("offline"); } });
  assert.equal(trackingFailure.headers.get("location"), `${origin}/?dailyBrief=${id}`);

  type Client = { url: string; focused?: boolean; visibilityState?: string; focus: () => Promise<Client>; navigate: (url: string) => Promise<Client | null> };
  const handlers: Record<string, (event: unknown) => void> = {};
  let clients: Client[] = [];
  const opened: string[] = [];
  const navigated: string[] = [];
  let closed = 0;
  let pending: Promise<unknown> = Promise.resolve();
  let notification: { data: { destinationUrl: string }; body: string; tag: string; icon: string };
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), { URL, self: {
    location: { origin }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
    registration: { showNotification: async (_title: string, options: typeof notification) => { notification = options; } },
    clients: { matchAll: async (options: { includeUncontrolled: boolean }) => { assert.equal(options.includeUncontrolled, true); return clients; }, openWindow: async (url: string) => { opened.push(url); } },
  } });
  const click = async (value: unknown) => {
    handlers.notificationclick({ notification: { data: { destinationUrl: value }, close: () => { closed++; } }, waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
    await pending;
  };
  function client(url: string, focused = false): Client {
    const item: Client = { url, focused, focus: async () => item, navigate: async (value) => { navigated.push(value); return item; } };
    return item;
  }
  await click(dailyBriefClickUrl(id));
  assert.deepEqual(opened.splice(0), [destination]);
  for (const value of ["javascript:alert(1)", "data:text/html,hi", "https://evil.test", "//evil.test", "/\\evil.test", "https://[bad", "/%ZZ", null, {}, "https://user:pass@leedswire.test/"]) {
    await click(value);
    assert.deepEqual(opened.splice(0), [origin + "/"]);
  }
  clients = [client("https://evil.test"), client(origin + "/news"), client(origin + "/media", true)];
  let preferred = false;
  clients[2].navigate = async (url) => { preferred = true; navigated.push(url); return clients[2]; };
  await click(destination);
  assert.equal(preferred, true);
  assert.deepEqual(navigated.splice(0), [destination]);
  assert.equal(opened.length, 0);
  clients = [client(destination), client(origin + "/news")];
  await click(destination);
  assert.equal(navigated.length, 0);
  clients = [client(origin + "/news"), client(origin + "/media")];
  clients[0].navigate = async () => { throw Error("closed"); };
  await click(destination);
  assert.deepEqual(navigated.splice(0), [destination]);
  assert.equal(opened.length, 0);
  clients = [client(origin + "/news")];
  clients[0].navigate = async () => null;
  await click(destination);
  assert.deepEqual(opened.splice(0), [destination]);
  clients = [client(origin + "/news")];
  clients[0].focus = async () => { throw Error("focus denied"); };
  await click(destination);
  assert.deepEqual(navigated.splice(0), [destination]);
  assert.equal(opened.length, 0);
  assert.ok(closed > 0);
  handlers.push({ data: { json: () => ({ title: "LEEDSWIRE DAILY", body: saved.headline, destinationUrl: dailyBriefClickUrl(id), tag: "leedswire-daily-brief" }) }, waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
  await pending;
  assert.equal(notification!.data.destinationUrl, destination);
  assert.equal(notification!.body, saved.headline);
  assert.equal(notification!.tag, "leedswire-daily-brief");
  console.log("daily brief click tests passed (mocked clients and tracking; no push sent)");
}
void main();
