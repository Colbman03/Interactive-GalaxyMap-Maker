import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parsePublicAtlas } from "../atlas/schema.ts";
import { importGalaxy, publishAtlas } from "../scripts/atlas-draft.ts";
import type { DraftAtlas } from "../scripts/atlas-draft.ts";
import type { Kind } from "../atlas/schema.ts";

const publicData = JSON.parse(
  readFileSync(
    new URL("../atlas/content/published-atlas.json", import.meta.url),
    "utf8",
  ),
);
// Synthetic fixture stays independent of the campaign's evolving published edition.
const topology: [string, string | null, Kind][] = [
  ["resonance", null, "resonance"],
  ["wish", "resonance", "realm"],
  ["hollow", "resonance", "realm"],
  ["example-wish-plane", "wish", "plane"],
  ["example-hollow-plane", "hollow", "plane"],
  ["example-galaxy", "example-wish-plane", "galaxy"],
  ["example-second-galaxy", "example-wish-plane", "galaxy"],
  ["example-hollow-galaxy", "example-hollow-plane", "galaxy"],
  ["example-system", "example-galaxy", "system"],
  ["example-distant-system", "example-galaxy", "system"],
  ["example-world", "example-system", "planet"],
  ["example-second-world", "example-system", "planet"],
];
const fixture = (): DraftAtlas => ({
  schemaVersion: 1,
  title: "Test atlas",
  edition: "Test",
  demo: true,
  nodes: topology.map(([id, parentId, kind]) => ({
    id,
    parentId,
    kind,
    name: id,
    summary: "",
    visibility: "published",
  })),
});
const secret = "SECRET_CANARY_DO_NOT_PUBLISH";

test("committed public edition is strict; synthetic hierarchy traverses all six levels", () => {
  parsePublicAtlas(publicData);
  const data = publishAtlas(fixture());
  assert.deepEqual(
    new Set(data.nodes.map((n) => n.kind)),
    new Set(["resonance", "realm", "plane", "galaxy", "system", "planet"]),
  );
});
test("publisher reconstructs public fields and drops GM fields at every depth", () => {
  const draft = fixture();
  draft.nodes.forEach((n) => {
    n.gmNotes = secret;
    Object.assign(n, { unknownSecret: { nested: secret } });
  });
  Object.assign(draft, { gmNotes: secret, futureEvents: [{ title: secret }] });
  draft.nodes[1].position = Object.assign({ x: 1, y: 2 }, { secret });
  const published = publishAtlas(draft);
  assert.ok(!JSON.stringify(published).includes(secret));
  assert.ok(!JSON.stringify(published).includes("gmNotes"));
  assert.equal(published.nodes.length, draft.nodes.length);
});
test("private parent suppresses otherwise published descendants without leaking counts or IDs", () => {
  const draft = fixture();
  draft.nodes.find((n) => n.id === "wish")!.visibility = "private";
  const published = publishAtlas(draft);
  assert.deepEqual(
    published.nodes.map((n) => n.id),
    ["resonance", "hollow", "example-hollow-plane", "example-hollow-galaxy"],
  );
});
test("missing visibility defaults to private; malformed visibility fails closed", () => {
  const draft = fixture();
  delete draft.nodes.find((n) => n.id === "wish")!.visibility;
  assert.ok(!publishAtlas(draft).nodes.some((n) => n.id === "wish"));
  Object.assign(draft.nodes[1], { visibility: "publshed" });
  assert.throws(() => publishAtlas(draft), /Visibility/);
});
test("private root cannot produce a broken public snapshot", () => {
  const draft = fixture();
  draft.nodes[0].visibility = "private";
  assert.throws(() => publishAtlas(draft));
});
test("raw drafts and unknown nested data are rejected by the public schema", () => {
  assert.throws(() => parsePublicAtlas(fixture()), /Unapproved field/);
  for (const mutate of [
    (d: DraftAtlas) => Object.assign(d, { gmNotes: secret }),
    (d: DraftAtlas) => Object.assign(d.nodes[0], { gmNotes: secret }),
    (d: DraftAtlas) => {
      d.nodes[1].position = Object.assign({ x: 1, y: 2 }, { hidden: secret });
    },
  ]) {
    const d = publishAtlas(fixture());
    mutate(d);
    assert.throws(() => parsePublicAtlas(d), /Unapproved field/);
  }
});
test("rejects duplicate IDs, dangling parents, wrong levels, cycles, and multiple roots", () => {
  const mutations = [
    (d: DraftAtlas) => {
      d.nodes[1].id = d.nodes[0].id;
    },
    (d: DraftAtlas) => {
      d.nodes[1].parentId = "missing";
    },
    (d: DraftAtlas) => {
      d.nodes[1].parentId = "example-world";
    },
    (d: DraftAtlas) => {
      d.nodes[0].parentId = "wish";
    },
    (d: DraftAtlas) => {
      d.nodes[1].parentId = null;
    },
  ];
  for (const mutate of mutations) {
    const d = fixture();
    mutate(d);
    assert.throws(() => publishAtlas(d));
  }
});
test("untrusted legacy exports enter as private structure with notes only in GM fields", () => {
  const campaign = {
    version: 1,
    systems: [{ id: "s", name: "Imported star", x: 10, y: 20, notes: secret }],
    planets: [
      { id: "p", systemId: "s", name: "Imported world", notes: secret },
    ],
    characters: [{ name: secret }],
    timeline: { secret },
  };
  const draft = fixture();
  const imported = importGalaxy(
    draft,
    campaign,
    "example-wish-plane",
    "Imported galaxy",
  );
  const additions = imported.nodes.slice(draft.nodes.length);
  assert.equal(additions.length, 3);
  assert.ok(
    additions.every((n) => n.visibility === "private" && n.summary === ""),
  );
  assert.equal(additions[1].gmNotes, secret);
  assert.deepEqual(publishAtlas(imported), publishAtlas(draft));
  additions.forEach((n) => {
    n.visibility = "published";
  });
  const snapshot = publishAtlas(imported);
  assert.equal(snapshot.nodes.length, draft.nodes.length + 3);
  assert.ok(!JSON.stringify(snapshot).includes(secret));
  assert.deepEqual(snapshot.nodes.at(-2)!.position, { x: 10, y: 20 });
});
test("legacy import rejects invalid destination and orphan planets", () => {
  assert.throws(() =>
    importGalaxy(
      fixture(),
      { version: 1, systems: [], planets: [] },
      "resonance",
      "Invalid",
    ),
  );
  assert.throws(() =>
    importGalaxy(
      fixture(),
      {
        version: 1,
        systems: [],
        planets: [{ id: "p", systemId: "missing", name: "World" }],
      },
      "example-wish-plane",
      "Invalid",
    ),
  );
});
test("text remains literal data, with no HTML interpretation step", () => {
  const draft = fixture();
  draft.nodes[0].summary = "<img src=x onerror=alert(1)>";
  assert.equal(
    publishAtlas(draft).nodes[0].summary,
    "<img src=x onerror=alert(1)>",
  );
});

test("CLI initializes once, privately imports, publishes safely, and preserves snapshot on failure", () => {
  const scratch = fileURLToPath(
    new URL("../.atlas-tests.local/", import.meta.url),
  );
  mkdirSync(scratch, { recursive: true });
  const checkout = mkdtempSync(path.join(scratch, "hr-atlas-test-"));
  for (const folder of ["atlas/content", "scripts"])
    mkdirSync(path.join(checkout, folder), { recursive: true });
  for (const file of [
    "scripts/atlas.ts",
    "scripts/atlas-draft.ts",
    "atlas/schema.ts",
  ]) {
    copyFileSync(
      new URL(`../${file}`, import.meta.url),
      path.join(checkout, file),
    );
  }
  writeFileSync(path.join(checkout, "package.json"), '{"type":"module"}');
  const publicPath = path.join(checkout, "atlas/content/published-atlas.json");
  writeFileSync(publicPath, JSON.stringify(publishAtlas(fixture())));
  const run = (...args: string[]) =>
    spawnSync(process.execPath, ["scripts/atlas.ts", ...args], {
      cwd: checkout,
      encoding: "utf8",
    });
  const init = run("init");
  assert.equal(init.status, 0, init.stderr);
  const draftPath = path.join(checkout, "private.local/atlas.json");
  const initialized = readFileSync(draftPath, "utf8");
  assert.notEqual(run("init").status, 0);
  assert.equal(readFileSync(draftPath, "utf8"), initialized);
  const campaign = {
    version: 1,
    systems: [{ id: "s", name: "Private system", x: 0, y: 0, notes: secret }],
    planets: [],
  };
  writeFileSync(
    path.join(checkout, "private.local/galaxy.json"),
    JSON.stringify(campaign),
  );
  assert.equal(
    run("import", "galaxy.json", "example-wish-plane", "Private galaxy").status,
    0,
  );
  assert.equal(run("publish").status, 0);
  assert.ok(!readFileSync(publicPath, "utf8").includes("Private"));
  const valid = readFileSync(publicPath, "utf8");
  const draft = JSON.parse(readFileSync(draftPath, "utf8"));
  draft.nodes[0].parentId = "missing";
  writeFileSync(draftPath, JSON.stringify(draft));
  assert.notEqual(run("publish").status, 0);
  assert.equal(readFileSync(publicPath, "utf8"), valid);
  assert.notEqual(
    run("import", "../package.json", "example-wish-plane", "Bad path").status,
    0,
  );
});
