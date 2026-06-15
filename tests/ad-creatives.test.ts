import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import {
  AdCreativeError,
  clearAdCreativesCache,
  creativeToCampaign,
  getActiveCreativeForPlacement,
  getActiveCreativeCampaignForPlacement,
  isManagedAdPlacement,
  isValidClickUrl,
  uploadAdCreative,
  type AdCreative,
} from "../src/lib/adCreatives";
import { appendHtml5ClickTags } from "../src/lib/adHtml5";

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

  const html5Creative: AdCreative = {
    id: "creative-html5",
    placement: "homepage-top",
    creative_variant: "desktop",
    name: "HTML5 campaign",
    file_url: "https://cdn.example.com/html5/index.html",
    creative_type: "html5",
    entry_url: "https://cdn.example.com/html5/index.html",
    original_filename: "creative.zip",
    click_url: "https://www.leedswire.com/advertise",
    is_active: true,
    uploaded_at: "2026-06-15T00:02:00.000Z",
    uploaded_by: "LeedsWire Admin",
    start_date: null,
    end_date: null,
    width: 970,
    height: 250,
  };
  const html5Campaign = creativeToCampaign(html5Creative);

  assert.equal(html5Campaign.creativeType, "html5");
  assert.equal(html5Campaign.desktopSrc, "https://cdn.example.com/html5/index.html");

  const taggedUrl = appendHtml5ClickTags(
    "https://cdn.example.com/html5/index.html?existing=1",
    "https://www.leedswire.com/advertise",
  );
  const tagged = new URL(taggedUrl);

  assert.equal(tagged.searchParams.get("existing"), "1");
  assert.equal(
    tagged.searchParams.get("clickTag"),
    "https://www.leedswire.com/advertise",
  );
  assert.equal(
    tagged.searchParams.get("clickTAG"),
    "https://www.leedswire.com/advertise",
  );
  assert.equal(
    tagged.searchParams.get("clicktag"),
    "https://www.leedswire.com/advertise",
  );
  assert.equal(
    appendHtml5ClickTags(
      "https://cdn.example.com/html5/index.html",
      "javascript:alert(1)",
    ),
    "https://cdn.example.com/html5/index.html",
  );

  const storageUploads: string[] = [];
  const insertBodies: unknown[] = [];
  const deactivateBodies: unknown[] = [];
  const validZip = zipSync({
    "index.html": strToU8("<!doctype html><script src=\"main.js\"></script>"),
    "main.js": strToU8("window.clickTag = window.clickTag || '';"),
  });

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/storage/v1/object/ads/")) {
      storageUploads.push(url);
      return new Response("{}", { status: 200 });
    }

    if (
      url.includes("/rest/v1/ad_creatives?placement=eq.homepage-top") &&
      init?.method === "PATCH"
    ) {
      deactivateBodies.push(JSON.parse(String(init.body)));
      return new Response(null, { status: 204 });
    }

    if (url.endsWith("/rest/v1/ad_creatives")) {
      insertBodies.push(JSON.parse(String(init?.body)));
      return Response.json([
        {
          ...(insertBodies.at(-1) as Record<string, unknown>),
          uploaded_at: "2026-06-15T00:03:00.000Z",
        },
      ]);
    }

    if (url.endsWith("/rest/v1/ad_creative_audit")) {
      return new Response("{}", { status: 201 });
    }

    return Response.json([]);
  }) as typeof fetch;

  const uploaded = await uploadAdCreative({
    placement: "homepage-top",
    creativeVariant: "desktop",
    creativeType: "html5",
    file: new File([validZip], "creative.zip", { type: "application/zip" }),
    name: "Valid HTML5",
    clickUrl: "https://www.leedswire.com/advertise",
    uploadedBy: "LeedsWire Admin",
  });

  assert.equal(uploaded.creative_type, "html5");
  assert.equal(uploaded.is_active, true);
  assert.equal(uploaded.original_filename, "creative.zip");
  assert.equal(uploaded.entry_url?.endsWith("/index.html"), true);
  assert.deepEqual(deactivateBodies[0], { is_active: false });
  assert.equal((insertBodies[0] as { is_active?: boolean }).is_active, true);
  assert.equal(storageUploads.length, 2);
  assert.equal(
    storageUploads.every((url) => url.includes("/storage/v1/object/ads/html5/")),
    true,
  );

  const uploadsBeforeMacMetadata = storageUploads.length;
  const uploadedWithMacMetadata = await uploadAdCreative({
    placement: "homepage-top",
    creativeVariant: "desktop",
    creativeType: "html5",
    file: new File(
      [
        zipSync({
          "index.html": strToU8("<!doctype html>"),
          "assets/styles.css": strToU8("body{margin:0}"),
          "__MACOSX/._index.html": strToU8("metadata"),
          ".DS_Store": strToU8("metadata"),
          "assets/.DS_Store": strToU8("metadata"),
          "assets/._styles.css": strToU8("metadata"),
        }),
      ],
      "mac-metadata.zip",
      { type: "application/zip" },
    ),
    uploadedBy: "LeedsWire Admin",
  });

  assert.equal(uploadedWithMacMetadata.is_active, true);
  assert.equal(storageUploads.length - uploadsBeforeMacMetadata, 2);
  assert.equal(
    storageUploads.slice(uploadsBeforeMacMetadata).some((url) => url.includes("__MACOSX")),
    false,
  );
  assert.equal(
    storageUploads.slice(uploadsBeforeMacMetadata).some((url) => url.includes(".DS_Store")),
    false,
  );
  assert.equal(
    storageUploads.slice(uploadsBeforeMacMetadata).some((url) => url.includes("._")),
    false,
  );

  await assert.rejects(
    uploadAdCreative({
      placement: "homepage-top",
      creativeVariant: "desktop",
      creativeType: "html5",
      file: new File([zipSync({ "main.js": strToU8("alert(1)") })], "bad.zip", {
        type: "application/zip",
      }),
      uploadedBy: "LeedsWire Admin",
    }),
    (error) =>
      error instanceof AdCreativeError &&
      error.code === "INVALID_CREATIVE" &&
      error.message.includes("index.html"),
  );

  await assert.rejects(
    uploadAdCreative({
      placement: "homepage-top",
      creativeVariant: "desktop",
      creativeType: "html5",
      file: new File(
        [zipSync({ "../index.html": strToU8("<!doctype html>") })],
        "traversal.zip",
        { type: "application/zip" },
      ),
      uploadedBy: "LeedsWire Admin",
    }),
    (error) =>
      error instanceof AdCreativeError &&
      error.code === "INVALID_CREATIVE" &&
      error.message === "Unsafe ZIP path: ../index.html",
  );

  await assert.rejects(
    uploadAdCreative({
      placement: "homepage-top",
      creativeVariant: "desktop",
      creativeType: "html5",
      file: new File(
        [zipSync({ "/index.html": strToU8("<!doctype html>") })],
        "absolute.zip",
        { type: "application/zip" },
      ),
      uploadedBy: "LeedsWire Admin",
    }),
    (error) =>
      error instanceof AdCreativeError &&
      error.code === "INVALID_CREATIVE" &&
      error.message === "Unsafe ZIP path: /index.html",
  );

  await assert.rejects(
    uploadAdCreative({
      placement: "homepage-top",
      creativeVariant: "desktop",
      creativeType: "html5",
      file: new File(
        [zipSync({ "index.html": strToU8("<!doctype html>"), "run.php": strToU8("") })],
        "danger.zip",
        { type: "application/zip" },
      ),
      uploadedBy: "LeedsWire Admin",
    }),
    (error) =>
      error instanceof AdCreativeError &&
      error.code === "INVALID_CREATIVE" &&
      error.message.includes("unsupported"),
  );

  restore();
  console.log("ad creatives tests passed");
}

run().catch((error) => {
  restore();
  throw error;
});
