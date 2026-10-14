# Interactive-GalaxyMap-Maker

## History’s Retribution Cosmic Atlas

This fork now includes a separate read-only player atlas with the hierarchy **Resonance → Wish / Hollow → planes → galaxies → systems → planets**. `npm run dev` starts the atlas; `npm run build` creates the player-only `dist/` output for Cloudflare Pages. The initial content is an explicitly labeled demonstration, not established campaign lore.

The original editor is still available locally through `npm run dev:gm`. Keep GM drafts and exported campaigns in the ignored `private.local/` folder, never in this public repository. The player build consumes only an explicitly published snapshot.

- [Atlas development, GM authoring, and publishing](docs/COSMIC-ATLAS.md)
- [Cloudflare Pages settings and domain setup](docs/CLOUDFLARE-PAGES.md)

The original project description follows. Its development commands now correspond to `dev:gm` / `build:gm`; the legacy production build has existing TypeScript errors documented in the atlas guide.

A passion project I used to explore Cursor AI capabilities and how to best work with Cursor AI

Allows for custom or procedural generation of interactive galaxies for long term campaigns. Includes an optional hotseat turn tracker per faction, fleet movements, regiment movements, area control, a timelapse of events, and more.

Interactive sector map for narrative wargame campaigns. Pan and zoom a galaxy view, drill into star systems and planets, and track factions, notes, and battle logs. Data auto-saves in the browser and can be exported as JSON.

## Features

- **Galaxy view** — pan/zoom (mouse wheel, drag), click a star to open its system
- **System view** — planets on orbital rings; click a planet for details
- **Planet / strategic view** — settlements, armies, and battle logs
- **Fleets** — compose and move fleets between systems along hyperlanes
- **Territory** — faction ownership and influence blobs across the map
- **Hotseat turns (Play mode)** — **Start campaign** in the top bar; only the active faction can move fleets/armies (one move each per turn). **Edit Galaxy** and free editing stay fully unrestricted. Building points: each owned manufactorum on a planet banks **10 BP/turn** on that world; spend **500** at a War Camp for a detachment, **1000** to build a manufactorum next to an owned city, or build ships at a Space Port (**50 BP** escort, other hulls scaled by class)
- **Galactic chronicle** — in-game recorded timelapse of ownership and fleet history with event markers
- **Editor** — **Maps → Edit Galaxy** for factions, galaxy contents (stars, hyperlanes, planets, structures), and upcoming events; Details panel for selection-focused edits
- **Persistence** — `localStorage` auto-save; **Save** / **Export** / **Import** JSON for backup and sharing

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Close Edit Galaxy, or go up one level (timeline/planet → system → galaxy) |

## Development

```bash
npm install
npm run dev
```

The app stays at [http://localhost:5173](http://localhost:5173). That command starts the dev server on that address when it is not already running, and opening this folder in Cursor does the same thing.

```bash
npm run build   # production build
npm run preview # preview production build
```

## Campaign JSON format

```json
{
  "version": 1,
  "name": "My Sector",
  "factions": [{ "id": "...", "name": "Imperium", "color": "#c9a227" }],
  "systems": [{ "id": "...", "name": "Cadian System", "x": 1800, "y": 1900, "notes": "" }],
  "planets": [{
    "id": "...",
    "systemId": "...",
    "name": "Cadia",
    "orbitIndex": 0,
    "type": "hive",
    "controllingFactionId": "...",
    "notes": "",
    "battles": [{ "id": "...", "date": "999.M41", "summary": "...", "outcome": "..." }]
  }]
}
```

Planet `type` is one of: `hive`, `forge`, `agri`, `death`, `shrine`, `custom`.

## Stack

Vite, React, TypeScript, Tailwind CSS, Zustand, Zod, react-zoom-pan-pinch, Three.js.
