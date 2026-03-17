/**
 * scitex-ui CSS index builder
 *
 * Auto-generates all.css, shell.css, and app.css by scanning the directory.
 * Run: npx tsx css/_build-index.ts
 */

import { readdirSync, statSync, writeFileSync } from "fs";
import { join, relative, dirname } from "path";

const CSS_DIR = dirname(new URL(import.meta.url).pathname);

function findCssFiles(dir: string, base: string = dir): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("_") || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...findCssFiles(full, base));
    } else if (
      entry.endsWith(".css") &&
      !["all.css", "shell.css", "app.css"].includes(entry)
    ) {
      files.push("./" + relative(base, full));
    }
  }
  return files.sort();
}

function buildIndex(name: string, subdirs: string[]): void {
  const files: string[] = [];
  for (const subdir of subdirs) {
    const dir = join(CSS_DIR, subdir);
    try {
      files.push(...findCssFiles(dir, CSS_DIR));
    } catch {
      /* dir doesn't exist */
    }
  }

  const header = `/**
 * scitex-ui — ${name} CSS bundle (AUTO-GENERATED)
 *
 * Do not edit manually. Regenerate with: npx tsx css/_build-index.ts
 */\n\n`;

  const imports = files.map((f) => `@import "${f}";`).join("\n");
  writeFileSync(join(CSS_DIR, `${name}.css`), header + imports + "\n");
  console.log(`${name}.css: ${files.length} imports`);
}

buildIndex("shell", ["shell", "primitives"]);
buildIndex("app", ["app"]);

// all.css = shell + app + utils
const allFiles = findCssFiles(CSS_DIR, CSS_DIR).filter(
  (f) =>
    !f.includes("_build") &&
    f !== "./all.css" &&
    f !== "./shell.css" &&
    f !== "./app.css",
);
const allHeader = `/**
 * scitex-ui — Complete CSS bundle (AUTO-GENERATED)
 *
 * Do not edit manually. Regenerate with: npx tsx css/_build-index.ts
 */\n\n`;
writeFileSync(
  join(CSS_DIR, "all.css"),
  allHeader + allFiles.map((f) => `@import "${f}";`).join("\n") + "\n",
);
console.log(`all.css: ${allFiles.length} imports`);
