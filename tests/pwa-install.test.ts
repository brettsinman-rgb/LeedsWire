import assert from "node:assert/strict";
import fs from "node:fs";

const provider = fs.readFileSync("src/components/PwaInstallPrompt.tsx", "utf8");
const cta = fs.readFileSync("src/components/PwaInstallCta.tsx", "utf8");
const layout = fs.readFileSync("src/app/layout.tsx", "utf8");
const header = fs.readFileSync("src/components/Header.tsx", "utf8");

assert.equal((provider.match(/addEventListener\("beforeinstallprompt"/g) ?? []).length, 1);
assert.match(provider, /PwaInstallContext\.Provider/);
assert.match(provider, /automaticPromptSuppressed\(\)/);
assert.doesNotMatch(cta, /SNOOZE_UNTIL_KEY|snooze/i);
assert.match(cta, /Add to Home Screen/i);
assert.match(cta, /min-h-11/);
assert.match(provider, /Tap the Share button in Safari/);
assert.match(provider, /Select “Add to Home Screen”/);
assert.match(provider, /Tap “Add”/);
assert.match(provider, /install_cta_view/);
assert.match(provider, /install_cta_click/);
assert.match(provider, /pwa_install_accepted/);
assert.match(provider, /pwa_install_dismissed/);
assert.match(provider, /pwa_ios_instructions_shown/);
assert.match(layout, /PwaInstallProvider/);
assert.match(header, /PwaInstallCta/);

console.log("PWA install CTA tests passed");
