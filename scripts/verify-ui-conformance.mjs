import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function filesUnder(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? filesUnder(path.join(relativeDirectory, entry.name)) : [path.join(relativeDirectory, entry.name)]));
  return nested.flat();
}

const violations = [];
const trackedUiFiles = [...await filesUnder("src"), ...await filesUnder("docs")].filter((file) => /\.(?:css|md|ts|tsx)$/.test(file));
for (const file of trackedUiFiles) {
  const source = await readFile(path.join(root, file), "utf8");
  if (/--crm-|var\(--crm-/.test(source)) violations.push(`${file}: legacy crm token`);
}

const reusableComponents = (await filesUnder("src/components"))
  .filter((file) => /\.tsx$/.test(file))
  .filter((file) => !file.replaceAll("\\", "/").includes("/marketing/"));
for (const file of reusableComponents) {
  const source = await readFile(path.join(root, file), "utf8");
  if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(source)) violations.push(`${file}: system color must use a semantic token`);
}

const globals = await readFile(path.join(root, "src/app/globals.css"), "utf8");
for (const marker of [".impulse-grid", ".impulse-atmosphere", ".impulse-visual", ".legal-prose", ".legal-source-content"]) {
  if (globals.includes(marker)) violations.push(`src/app/globals.css: business selector ${marker}`);
}

if (violations.length > 0) {
  console.error(`UI conformance failed:\n${violations.map((item) => `- ${item}`).join("\n")}`);
  process.exit(1);
}

console.log("UI conformance: semantic tokens and global CSS boundaries are clean.");
