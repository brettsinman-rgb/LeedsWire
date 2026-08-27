import assert from "node:assert/strict";
import fs from "node:fs";
import { mediaChannelLinks } from "../src/lib/mediaChannels";

assert.deepEqual(
  mediaChannelLinks.map((channel) => channel.label),
  ["Leeds Official", "Leeds View", "The Square Ball", "One Leeds", "Moustachi1"],
);

const component = fs.readFileSync("src/components/MediaChannelNav.tsx", "utf8");
const styles = fs.readFileSync("src/app/globals.css", "utf8");

assert.match(component, /media-channel-nav min-w-0 max-w-full/);
assert.match(component, /media-channel-list/);
assert.match(component, /flex-wrap justify-start/);
assert.doesNotMatch(component, /overflow-x-auto/);
assert.doesNotMatch(component, /sm:flex-nowrap|md:flex-nowrap|lg:flex-nowrap/);
assert.match(styles, /@container media-channel-nav \(min-width: 720px\)/);
assert.match(styles, /\.media-channel-list\s*{[^}]*flex-wrap: wrap/);
assert.match(styles, /@container[\s\S]*\.media-channel-list\s*{[^}]*flex-wrap: nowrap/);

console.log("media channel navigation tests passed");
