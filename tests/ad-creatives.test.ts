import assert from "node:assert/strict";
import {
  clearAdCreativesCache,
  getActiveCreativeForPlacement,
  getActiveCreativeCampaignForPlacement,
  isManagedAdPlacement,
  isValidClickUrl,
  type AdCreative,
} from "../src/lib/adCreatives";

const originalFetch = global.fetch;
const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function restore() {
  global.fetch = originalFetch;

  if (originalUrl === undefined) {
    delete process.env.SUPABASE_URL;
  } else {
    process.env.SUPABASE_URL = originalUrl;
  }

  if (originalKey === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }

  clearAdCreativesCache();
}

async function run() {
  assert.equal(isManagedAdPlacement("homepage-top"), true);
  assert.equal(isManagedAdPlacement("media-top"), false);
  assert.equal(isValidClickUrl("https://www.leedswire.com/advertise"), true);
  assert.equal(isValidClickUrl("http://www.leedswire.com/advertise"), true);
  assert.equal(isValidClickUrl("javascript:alert(1)"), false);
  assert.equal(isValidClickUrl("data:text/html,hello"), false);

  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  clearAdCreativesCache();

  const rows: AdCreative[] = [
    {
      id: "creative-1",
      placement: "homepage-top",
      creative_variant: "desktop",
      name: "Top campaign",
      file_url: "https://cdn.example.com/top.jpg",
      click_url: "https://www.leedswire.com/advertise",
      is_active: true,
      uploaded_at: "2026-06-15T00:00:00.000Z",
      uploaded_by: "LeedsWire Admin",
      start_date: null,
      end_date: null,
      width: 970,
      height: 250,
    },
    {
      id: "creative-2",
      placement: "homepage-top",
      creative_variant: "mobile",
      name: "Top mobile campaign",
      file_url: "https://cdn.example.com/top-mobile.jpg",
      click_url: "https://www.leedswire.com/mobile",
      is_active: true,
      uploaded_at: "2026-06-15T00:01:00.000Z",
      uploaded_by: "LeedsWire Admin",
      start_date: null,
      end_date: null,
      width: 300,
      height: 100,
    },
  ];

  global.fetch = (async () => Response.json(rows)) as typeof fetch;

  const active = await getActiveCreativeForPlacement("homepage-top", {
    refresh: true,
    variant: "desktop",
  });
  assert.equal(active?.id, "creative-1");

  const campaign = await getActiveCreativeCampaignForPlacement(
    "homepage-top",
    "desktop",
  );
  assert.equal(campaign?.desktopSrc, "https://cdn.example.com/top.jpg");
  assert.equal(campaign?.clickUrl, "https://www.leedswire.com/advertise");

  const mobile = await getActiveCreativeForPlacement("homepage-top", {
    variant: "mobile",
  });
  assert.equal(mobile?.id, "creative-2");

  restore();
  console.log("ad creatives tests passed");
}

run().catch((error) => {
  restore();
  throw error;
});
