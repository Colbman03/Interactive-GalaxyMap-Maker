import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
async function check(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = path.join(dir, entry.name);
    if (entry.isSymbolicLink())
      throw new Error("Symlinks are not allowed in the player output.");
    if (entry.isDirectory()) files.push(...(await check(name)));
    else files.push(name);
  }
  return files;
}
const files = await check(dist);
for (const file of files) {
  const relative = path.relative(dist, file).replaceAll("\\", "/");
  if (
    !/^(index\.html|_headers|assets\/[a-zA-Z0-9_-]+\.(js|css))$/.test(relative)
  ) {
    throw new Error(`Unexpected file in the player build: ${relative}`);
  }
  const text = await readFile(file, "utf8");
  if (
    /gmNotes|private\.local|useCampaignStore|galaxyEditorOpen|sourceMappingURL|SECRET_CANARY_DO_NOT_PUBLISH/.test(
      text,
    )
  ) {
    throw new Error(`Authoring content detected in player build: ${relative}`);
  }
}
for (const required of ["index.html", "_headers"]) {
  if (!files.includes(path.join(dist, required)))
    throw new Error(`Missing ${required}`);
}
console.log(
  `Player build verified: ${files.length} static files; no authoring modules, private fields, or source maps.`,
);
