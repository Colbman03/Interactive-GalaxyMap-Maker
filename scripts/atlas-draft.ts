import { randomUUID } from "node:crypto";
import {
  parseNode,
  parsePublicAtlas,
  record,
  validateHierarchy,
} from "../atlas/schema.ts";
import type { AtlasNode, PublicAtlas } from "../atlas/schema.ts";

export interface DraftNode extends AtlasNode {
  visibility?: "private" | "published";
  gmNotes?: string;
}
export interface DraftAtlas extends Omit<PublicAtlas, "nodes"> {
  nodes: DraftNode[];
}

/** Reconstruct every public field. Never spread draft objects into a public snapshot. */
export function publishAtlas(value: unknown): PublicAtlas {
  const source = record(value);
  if (!Array.isArray(source.nodes)) throw new Error("Draft needs locations.");
  const nodes = source.nodes.map((raw) => {
    const n = record(raw);
    if (
      n.visibility !== undefined &&
      n.visibility !== "published" &&
      n.visibility !== "private"
    ) {
      throw new Error("Visibility must be private or published.");
    }
    return {
      publicNode: parseNode(n, false),
      published: n.visibility === "published",
    };
  });
  validateHierarchy(nodes.map((n) => n.publicNode));
  const byId = new Map(nodes.map((n) => [n.publicNode.id, n]));
  const visible = (id: string): boolean => {
    const node = byId.get(id)!;
    return (
      node.published &&
      (node.publicNode.parentId === null || visible(node.publicNode.parentId))
    );
  };
  return parsePublicAtlas({
    schemaVersion: source.schemaVersion,
    title: source.title,
    edition: source.edition,
    demo: source.demo,
    nodes: nodes
      .filter((n) => visible(n.publicNode.id))
      .map((n) => n.publicNode),
  });
}

/** Import only map structure from a legacy export; all imported locations start private. */
export function importGalaxy(
  draft: DraftAtlas,
  value: unknown,
  planeId: string,
  name: string,
): DraftAtlas {
  const c = record(value);
  if (c.version !== 1 || !Array.isArray(c.systems) || !Array.isArray(c.planets))
    throw new Error("Expected a version 1 Galaxy Map Maker export.");
  if (!draft.nodes.some((n) => n.id === planeId && n.kind === "plane"))
    throw new Error("Choose an existing plane ID.");
  const id = () => `loc-${randomUUID()}`;
  const galaxyId = id();
  const additions: DraftNode[] = [
    {
      id: galaxyId,
      parentId: planeId,
      kind: "galaxy",
      name,
      summary: "",
      visibility: "private",
    },
  ];
  const systems = new Map<string, string>();
  const planetIds = new Set<string>();
  for (const value of c.systems) {
    const s = record(value);
    if (typeof s.id !== "string" || systems.has(s.id))
      throw new Error("Missing or duplicate system ID in import.");
    const systemId = id();
    systems.set(s.id, systemId);
    const n = parseNode({
      id: systemId,
      parentId: galaxyId,
      kind: "system",
      name: s.name,
      summary: "",
      position: { x: s.x, y: s.y },
    });
    additions.push({
      ...n,
      visibility: "private",
      gmNotes: typeof s.notes === "string" ? s.notes : "",
    });
  }
  for (const value of c.planets) {
    const p = record(value);
    if (typeof p.id !== "string" || planetIds.has(p.id))
      throw new Error("Missing or duplicate planet ID in import.");
    planetIds.add(p.id);
    const parentId = systems.get(String(p.systemId));
    if (!parentId) throw new Error("A planet references a missing system.");
    const n = parseNode({
      id: id(),
      parentId,
      kind: "planet",
      name: p.name,
      summary: "",
    });
    additions.push({
      ...n,
      visibility: "private",
      gmNotes: typeof p.notes === "string" ? p.notes : "",
    });
  }
  const result = { ...draft, nodes: [...draft.nodes, ...additions] };
  validateHierarchy(result.nodes.map((n) => parseNode(n, false)));
  return result;
}
