import { readFile, writeFile, mkdir, realpath, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePublicAtlas } from "../atlas/schema.ts";
import { publishAtlas, importGalaxy } from "./atlas-draft.ts";
import type { DraftAtlas } from "./atlas-draft.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const privateDir = path.join(root, "private.local");
const draftPath = path.join(privateDir, "atlas.json");
const publishedPath = path.join(root, "atlas/content/published-atlas.json");
const read = async (p: string): Promise<unknown> =>
  JSON.parse(await readFile(p, "utf8"));
async function save(p: string, value: unknown) {
  await writeFile(`${p}.tmp`, JSON.stringify(value, null, 2) + "\n", "utf8");
  await rename(`${p}.tmp`, p);
}
async function main() {
  const [command, ...args] = process.argv.slice(2);
  await mkdir(privateDir, { recursive: true });
  // Refuse a redirected private folder that could accidentally point into public source.
  if (
    path.resolve(await realpath(privateDir)).toLowerCase() !==
    path.resolve(privateDir).toLowerCase()
  ) {
    throw new Error(
      "private.local must be a real folder in this checkout, not a symlink.",
    );
  }
  if (command === "init" && args.length === 0) {
    const publicAtlas = parsePublicAtlas(await read(publishedPath));
    const draft: DraftAtlas = {
      ...publicAtlas,
      nodes: publicAtlas.nodes.map((n) => ({
        ...n,
        visibility: "published",
        gmNotes: "",
      })),
    };
    // Exclusive create protects existing GM authoring work.
    await writeFile(draftPath, JSON.stringify(draft, null, 2) + "\n", {
      flag: "wx",
    });
    console.log(
      "Created private.local/atlas.json from the current public edition. Edit this draft locally.",
    );
  } else if (command === "publish" && args.length === 0) {
    const result = publishAtlas(await read(draftPath));
    await save(publishedPath, result);
    console.log(
      `Exported ${result.nodes.length} public locations. Review the public JSON diff before committing. This does not deploy.`,
    );
  } else if (command === "import" && args.length === 3) {
    const [filename, planeId, galaxyName] = args;
    const campaignPath = await realpath(path.resolve(privateDir, filename));
    const relative = path.relative(await realpath(privateDir), campaignPath);
    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      campaignPath === draftPath
    )
      throw new Error(
        "Put a separate campaign export inside private.local first.",
      );
    const draft = (await read(draftPath)) as DraftAtlas;
    const result = importGalaxy(
      draft,
      await read(campaignPath),
      planeId,
      galaxyName,
    );
    // Keep a private backup before replacing authoring content.
    await writeFile(
      `${draftPath}.${Date.now()}.bak`,
      JSON.stringify(draft, null, 2) + "\n",
      { flag: "wx" },
    );
    await save(draftPath, result);
    console.log(
      "Imported galaxy structure as private locations. Notes remain GM-only. Original export and draft backup retained.",
    );
  } else {
    throw new Error(
      'Usage: npm run atlas:init | npm run atlas:publish | npm run atlas:import -- galaxy.json plane-id "Galaxy name"',
    );
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Atlas command failed.",
  );
  process.exitCode = 1;
});
