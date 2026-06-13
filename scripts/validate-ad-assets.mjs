import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = process.cwd();
const sourceRoot = join(projectRoot, "src");
const publicRoot = join(projectRoot, "public");
const adsRoot = join(publicRoot, "ads");
const adPathPattern = /["'`](\/ads\/[^"'`)\s]+)["'`]/g;

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }

    return entry.isFile() ? [fullPath] : [];
  });
}

function listPublicAdAssets(directory = adsRoot) {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listPublicAdAssets(fullPath);
    }

    if (!entry.isFile() || entry.name.startsWith(".")) {
      return [];
    }

    return [`/${relative(publicRoot, fullPath)}`];
  });
}

const configuredPaths = new Set();

for (const filePath of walkFiles(sourceRoot)) {
  if (!/\.(ts|tsx|js|jsx|mjs)$/.test(filePath)) {
    continue;
  }

  const contents = readFileSync(filePath, "utf8");
  let match;

  while ((match = adPathPattern.exec(contents))) {
    configuredPaths.add(match[1]);
  }
}

const availableAssets = new Set(listPublicAdAssets());
const missingAssets = [...configuredPaths].filter((assetPath) => {
  const filesystemPath = join(publicRoot, assetPath);

  return !availableAssets.has(assetPath) || !statSync(filesystemPath).isFile();
});

if (missingAssets.length > 0) {
  console.error("Missing LeedsWire ad assets:");

  for (const assetPath of missingAssets) {
    console.error(`- ${assetPath}`);
  }

  process.exit(1);
}

console.info(
  `LeedsWire ad asset validation passed (${configuredPaths.size} configured, ${availableAssets.size} available).`,
);
