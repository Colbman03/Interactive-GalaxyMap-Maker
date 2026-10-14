# History’s Retribution Cosmic Atlas

The player atlas is a separate static React/Vite entry point in `atlas/`. The original Galaxy Map Maker remains in `src/` for local GM authoring. This first adaptation supports:

`Resonance → Wish / Hollow (realms) → planes → galaxies → systems → planets`

The hierarchy is a containment tree, not a travel network. A plane can contain multiple galaxies. The bundled survey uses the campaign’s three supplied names; deeper entries are explicitly labeled examples. No private campaign content was supplied or incorporated.

## Run locally

Use Node 24 (also specified in `.node-version`). From the repository root:

```sh
npm ci
npm run dev       # player atlas, http://127.0.0.1:5174
npm run build     # tests, type check, static build, output inspection
npm run preview   # production player build, http://127.0.0.1:4174
npm run dev:gm    # original local editor, http://localhost:5173
```

Use the atlas’s tree, map points, cards, breadcrumbs, or global search to navigate. `/` focuses search. URLs use location ID fragments, so copied links and browser back/forward work without server routing. Unknown IDs return to the root with a notice. Pan/zoom controls affect only the view, never the published data.

`npm run build:gm` targets `dist-gm/`, which must never be used for the player site. At the starting upstream commit (`2ec2863`), the GM production type check reports existing errors in fleet locations, planet textures, and the campaign store, including undefined `port` references. This PR does not repair those unrelated systems. Local editing remains available through Vite, but the full legacy editor needs its own repair/testing pass before relying on its game mechanics.

## GM workflow

1. Run `npm run atlas:init` once. This creates `private.local/atlas.json` from the current public edition and refuses to overwrite an existing draft. The starter entries are already published examples.
2. Edit this local JSON draft. New locations should have `"visibility": "private"`. Store secret text only in `gmNotes` or another private field, never in a published name, ID, position, or summary.
3. Add each parent before its children, following the six levels above. A node has `id`, `parentId`, `kind`, `name`, `summary`, and optional numeric `position: {x, y}`. Exactly one `resonance` node has `parentId: null`. `realm` is the level for Wish and Hollow.
4. When an entry and all its ancestors are ready for players, set each entry’s `visibility` to `published`. Missing visibility means private. A private ancestor suppresses its entire subtree, even when descendants are marked published.
5. Run `npm run atlas:publish`. This replaces only `atlas/content/published-atlas.json` with a reconstructed allowlist of public fields. It does not commit, push, or deploy.
6. Review the public JSON diff for names, IDs, coordinates, and prose that should not be disclosed. Change `demo` to false only after replacing the illustrative entries with approved campaign content; update `edition` for the release.
7. Run `npm run build`, commit only the public snapshot/code/docs, and open a review PR. Merge after review to release through Cloudflare.

Example draft location (inside the local draft’s `nodes` list):

```json
{
  "id": "new-world",
  "parentId": "example-system",
  "kind": "planet",
  "name": "A player-safe name",
  "summary": "A description approved for players.",
  "visibility": "private",
  "gmNotes": "Private authoring notes belong here."
}
```

Keep a private backup of `private.local/` outside the public repository. Git ignores this folder and `*.private.json`; ignore rules do not protect files force-added or uploaded manually. Never paste drafts or secrets into PR descriptions, public issues, or screenshots.

## Bring in an existing galaxy

Export JSON from the local legacy editor and place it in `private.local/galaxy.json`. The original export is retained as the authoritative full campaign backup. With a draft initialized:

```sh
npm run atlas:import -- galaxy.json example-wish-plane "My galaxy"
```

The importer appends a galaxy, its systems with positions, and its planets beneath an existing plane. It creates fresh IDs, moves system/planet notes into `gmNotes`, leaves player summaries blank, and marks every imported entry private. It saves a timestamped draft backup first. Reimporting appends a new galaxy; it does not merge or synchronize existing records.

Factions, fleets, armies, characters, timeline events, battle logs, hyperlanes, planet classifications, and surface data are not published or migrated in this first pass. They remain in the original campaign export. Curate player descriptions manually. This is a read-only cosmology and map layer, not a full port of the strategy simulation or 3D planet renderer.

## How secrets stay out of the website

- The browser receives only a strict `PublicAtlas` snapshot. No GM store, import/export editor, local-storage persistence, write API, authoring route, or runtime mode switch is included.
- The publisher constructs approved public fields individually. It never spreads draft records into the public payload. Unknown/private fields are removed; bad visibility, duplicate IDs, orphan parents, wrong levels, and cycles fail validation.
- The build rejects unknown fields in the committed public JSON. It never reads `private.local` or loads `.env` files. The `atlas/` entry has `publicDir: false`, so the repository’s legacy `public/` folder is not copied.
- A bundle boundary rejects application modules outside `atlas/`; dependencies remain permitted. Output inspection accepts only the HTML, generated headers, and JS/CSS assets, and rejects source maps and known authoring markers.
- Plain React text rendering displays names and descriptions without interpreting HTML. The static site uses local assets only and has a restrictive Content Security Policy through Cloudflare’s `_headers` file.

These checks are guardrails, not a semantic secret detector. Text deliberately placed in approved public fields is public. Review the snapshot before pushing because this GitHub fork itself is public. Anyone who can load the player site can inspect all its published content. Removing a published entry cannot recall downloaded copies, Git history, or old deployment URLs. `noindex` is a search-engine preference, not authentication.

If authenticated remote GM authoring is added later, it must use separate storage and server-side authorization. Do not introduce GM secrets via frontend environment variables or a hidden client-side editor switch.

## Validation

`npm run build` runs synthetic tests for omitted visibility, hidden ancestors, nested private fields, imported notes, malformed hierarchy, and strict public schemas; then checks the atlas TypeScript and production output. Test fixtures are independent of the campaign’s public entries.

Before a release, exercise both realm branches; navigate down to a world and back; check search and unknown links; inspect desktop and phone layouts; inspect the published snapshot diff; and confirm Cloudflare deploys only `dist/`.

## Attribution and scope

Based on [CaptainCrunch08/Interactive-GalaxyMap-Maker](https://github.com/CaptainCrunch08/Interactive-GalaxyMap-Maker), using the user’s [Colbman03 fork](https://github.com/Colbman03/Interactive-GalaxyMap-Maker). The original source and documentation are retained. No LICENSE file was present at the inspected upstream commit; this contribution does not invent or change the upstream license. Confirm reuse terms with the upstream author before broader redistribution.

Deployment instructions: [Cloudflare Pages](CLOUDFLARE-PAGES.md).
