export const kinds = [
  "resonance",
  "realm",
  "plane",
  "galaxy",
  "system",
  "planet",
] as const;
export type Kind = (typeof kinds)[number];
export interface AtlasNode {
  id: string;
  parentId: string | null;
  kind: Kind;
  name: string;
  summary: string;
  position?: { x: number; y: number };
}
export interface PublicAtlas {
  schemaVersion: 1;
  title: string;
  edition: string;
  demo: boolean;
  nodes: AtlasNode[];
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected an object.");
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new Error(
      "Unapproved field in public atlas. Export through atlas:publish.",
    );
  }
}
export function textField(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max)
    throw new Error("Invalid text field.");
  return value;
}
export function parseNode(value: unknown, strict = true): AtlasNode {
  const n = record(value);
  if (strict)
    exactKeys(n, ["id", "parentId", "kind", "name", "summary", "position"]);
  if (typeof n.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,95}$/.test(n.id))
    throw new Error("IDs must be short lowercase slugs.");
  if (n.parentId !== null && typeof n.parentId !== "string")
    throw new Error("Invalid parent ID.");
  if (!kinds.includes(n.kind as Kind))
    throw new Error("Invalid hierarchy level.");
  const name = textField(n.name, 160);
  if (!name.trim()) throw new Error("Every location needs a name.");
  const node: AtlasNode = {
    id: n.id,
    parentId: n.parentId,
    kind: n.kind as Kind,
    name,
    summary: textField(n.summary, 12000),
  };
  if (n.position !== undefined) {
    const p = record(n.position);
    if (strict) exactKeys(p, ["x", "y"]);
    if (
      typeof p.x !== "number" ||
      typeof p.y !== "number" ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      Math.abs(p.x) > 1000000 ||
      Math.abs(p.y) > 1000000
    )
      throw new Error("Invalid map position.");
    node.position = { x: p.x, y: p.y };
  }
  return node;
}

export function validateHierarchy(nodes: AtlasNode[]) {
  if (nodes.length < 1 || nodes.length > 20000)
    throw new Error("Atlas must contain 1–20,000 locations.");
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (byId.size !== nodes.length) throw new Error("Duplicate location IDs.");
  const roots = nodes.filter((n) => n.parentId === null);
  if (roots.length !== 1 || roots[0].kind !== "resonance")
    throw new Error("Atlas needs exactly one Resonance root.");
  for (const node of nodes) {
    if (node.parentId === null) continue;
    const parent = byId.get(node.parentId);
    // Strictly increasing levels also reject cycles and disconnected subtrees.
    if (
      !parent ||
      kinds.indexOf(parent.kind) + 1 !== kinds.indexOf(node.kind)
    ) {
      throw new Error(
        "Invalid parent: use Resonance → realm → plane → galaxy → system → planet.",
      );
    }
  }
}

/** Public snapshots reject unknown keys instead of silently bundling them. */
export function parsePublicAtlas(value: unknown): PublicAtlas {
  const a = record(value);
  exactKeys(a, ["schemaVersion", "title", "edition", "demo", "nodes"]);
  if (
    a.schemaVersion !== 1 ||
    typeof a.demo !== "boolean" ||
    !Array.isArray(a.nodes)
  )
    throw new Error("Invalid public atlas.");
  const nodes = a.nodes.map((n) => parseNode(n));
  validateHierarchy(nodes);
  return {
    schemaVersion: 1,
    title: textField(a.title, 160),
    edition: textField(a.edition, 160),
    demo: a.demo,
    nodes,
  };
}
