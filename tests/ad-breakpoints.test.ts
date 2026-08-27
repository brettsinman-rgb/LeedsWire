import assert from "node:assert/strict";
import fs from "node:fs";
import {
  MOBILE_AD_MAX_WIDTH,
  MOBILE_AD_MEDIA_QUERY,
  isMobileAdWidth,
} from "../src/lib/adBreakpoints";

assert.equal(MOBILE_AD_MAX_WIDTH, 639);
assert.equal(MOBILE_AD_MEDIA_QUERY, "(max-width: 639px)");
assert.equal(isMobileAdWidth(320), true);
assert.equal(isMobileAdWidth(639), true);
assert.equal(isMobileAdWidth(640), false);

for (const tabletWidth of [768, 810, 820, 834, 1024, 1180]) {
  assert.equal(
    isMobileAdWidth(tabletWidth),
    false,
    `${tabletWidth}px must retain the 970x250 desktop/tablet creative`,
  );
}

const adSlot = fs.readFileSync("src/components/AdSlot.tsx", "utf8");
assert.match(adSlot, /matchMedia\(MOBILE_AD_MEDIA_QUERY\)/);
assert.match(adSlot, /aspectRatio: `\$\{resolvedDesktop\[0\]\} \/ \$\{resolvedDesktop\[1\]\}`/);
assert.match(adSlot, /slot === "desktop" \? "h-full w-full object-contain"/);
assert.match(adSlot, /data-ad-variant="desktop"/);
assert.match(adSlot, /data-ad-variant="mobile"/);

console.log("ad breakpoint tests passed");
