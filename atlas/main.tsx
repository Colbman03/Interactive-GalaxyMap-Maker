import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import data from "./content/published-atlas.json";
import { parsePublicAtlas } from "./schema.ts";
import type { AtlasNode, Kind } from "./schema.ts";
import "./style.css";

const atlas = parsePublicAtlas(data);
const byId = new Map(atlas.nodes.map((node) => [node.id, node]));
const root = atlas.nodes.find((node) => node.parentId === null)!;
const labels: Record<Kind, string> = {
  resonance: "Reality",
  realm: "Realm",
  plane: "Plane",
  galaxy: "Galaxy",
  system: "Star system",
  planet: "World",
};
function hashId() {
  try {
    return decodeURIComponent(window.location.hash.slice(1)) || root.id;
  } catch {
    return "";
  }
}
function ancestry(node: AtlasNode) {
  const result = [node];
  while (result[0].parentId) result.unshift(byId.get(result[0].parentId)!);
  return result;
}
function Glyph({ kind, large = false }: { kind: Kind; large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`glyph glyph-${kind} ${large ? "glyph-large" : ""}`}
    >
      {kind === "resonance"
        ? "✧"
        : kind === "realm"
          ? "◈"
          : kind === "plane"
            ? "◇"
            : kind === "galaxy"
              ? "✺"
              : kind === "system"
                ? "✦"
                : "●"}
    </span>
  );
}
function locations(nodes: AtlasNode[]) {
  const positioned = nodes.filter((n) => n.position);
  const xs = positioned.map((n) => n.position!.x);
  const ys = positioned.map((n) => n.position!.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  return nodes.map((node, index) => {
    if (node.position) {
      return {
        node,
        x:
          minX === maxX
            ? 50
            : 20 + ((node.position.x - minX) / (maxX - minX)) * 60,
        y:
          minY === maxY
            ? 28
            : 24 + ((node.position.y - minY) / (maxY - minY)) * 52,
      };
    }
    const angle =
      (index / Math.max(1, nodes.length)) * 2 * Math.PI - Math.PI / 4;
    return { node, x: 50 + Math.cos(angle) * 30, y: 50 + Math.sin(angle) * 30 };
  });
}

function CosmicMap({
  selected,
  children,
  navigate,
}: {
  selected: AtlasNode;
  children: AtlasNode[];
  navigate: (id: string) => void;
}) {
  const positions = locations(children);
  return (
    <section
      className={`map map-${selected.kind}`}
      aria-label={`Map of ${selected.name}`}
    >
      <div className="map-topline">
        <span>
          <i className="signal" />{" "}
          {children.length ? "Charted locations" : "Location portrait"}
        </span>
        <span>{labels[selected.kind]} view</span>
      </div>
      <TransformWrapper
        key={selected.id}
        minScale={0.6}
        maxScale={3}
        initialScale={1}
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        panning={{ excluded: ["button"] }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent
              wrapperClass="map-viewport"
              contentClass="map-content"
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: "100%", height: "100%" }}
            >
              <div className="map-stage">
                <div className="cosmic-halo" />
                <svg
                  className="map-orbits"
                  viewBox="0 0 1000 600"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <ellipse cx="500" cy="300" rx="310" ry="175" />
                  <ellipse cx="500" cy="300" rx="375" ry="225" />
                  <path d="M500 28V572 M38 300H962" className="axis" />
                  {positions.map(({ node, x, y }) => (
                    <path
                      key={node.id}
                      d={`M500 300 L${x * 10} ${y * 6}`}
                      className="connection"
                    />
                  ))}
                </svg>
                <div className="map-center">
                  <Glyph kind={selected.kind} large />
                  <span>{selected.name}</span>
                  <small>{labels[selected.kind]}</small>
                </div>
                {positions.map(({ node, x, y }) => (
                  <button
                    key={node.id}
                    className={`map-node map-node-${node.kind}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={() => navigate(node.id)}
                    aria-label={`Explore ${node.name}`}
                  >
                    <Glyph kind={node.kind} large />
                    <span>{node.name}</span>
                    <small>
                      {labels[node.kind]} <span aria-hidden="true">↗</span>
                    </small>
                  </button>
                ))}
              </div>
            </TransformComponent>
            <div
              className="map-controls"
              role="group"
              aria-label="Map controls"
            >
              <button aria-label="Zoom in" onClick={() => zoomIn()}>
                +
              </button>
              <button aria-label="Zoom out" onClick={() => zoomOut()}>
                −
              </button>
              <button
                aria-label="Reset map view"
                onClick={() => resetTransform()}
              >
                ↺
              </button>
            </div>
          </>
        )}
      </TransformWrapper>
      <div className="map-caption">
        <span>Drag to pan · Scroll to zoom</span>
        <span>Symbolic scale</span>
      </div>
    </section>
  );
}

function App() {
  const [selectedId, setSelectedId] = useState(hashId);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const selected = byId.get(selectedId) ?? root;
  const path = ancestry(selected);
  const children = atlas.nodes.filter((node) => node.parentId === selected.id);
  const results = query.trim()
    ? atlas.nodes.filter((n) =>
        `${n.name} ${n.summary}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : [];
  useEffect(() => {
    const changed = () => {
      setSelectedId(hashId());
      setCopied(false);
    };
    const shortcut = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !(event.target instanceof HTMLInputElement) &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("hashchange", changed);
    window.addEventListener("keydown", shortcut);
    return () => {
      window.removeEventListener("hashchange", changed);
      window.removeEventListener("keydown", shortcut);
    };
  }, []);
  useEffect(() => {
    document.title = `${selected.name} · History’s Retribution`;
  }, [selected.name]);
  function navigate(id: string) {
    setSelectedId(id);
    setCopied(false);
    setQuery("");
    window.location.hash = encodeURIComponent(id);
    heading.current?.focus({ preventScroll: true });
  }
  async function copyLink() {
    const url = new URL(window.location.href);
    url.hash = selected.id;
    try {
      await navigator.clipboard.writeText(url.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <>
      <a
        className="skip-link"
        href="#atlas-content"
        onClick={(event) => {
          event.preventDefault();
          heading.current?.focus();
          heading.current?.scrollIntoView({ block: "start" });
        }}
      >
        Skip to atlas
      </a>
      <header className="masthead">
        <button
          className="brand"
          onClick={() => navigate(root.id)}
          aria-label="Return to the Resonance"
        >
          <span className="brand-seal" aria-hidden="true">
            ✧
          </span>
          <span>
            {atlas.title}
            <small>THE COSMIC ATLAS</small>
          </span>
        </button>
        <div className="masthead-right">
          <span className="edition">{atlas.edition}</span>
          <span className="player-badge">
            <i className="signal" /> Player edition
          </span>
        </div>
      </header>
      {atlas.demo && (
        <div className="survey-note">
          <span className="note-mark" aria-hidden="true">
            ✦
          </span>
          <strong>A first survey of the cosmos.</strong> Planes, galaxies,
          systems, and worlds shown here are examples, awaiting campaign lore.
        </div>
      )}
      <div className="workspace">
        <aside className="navigator" aria-label="Atlas navigation">
          <div className="section-label">
            EXPLORE THE COSMOS <span>01</span>
          </div>
          <label className="search">
            <span aria-hidden="true">⌕</span>
            <input
              ref={searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a place…"
              aria-label="Search known locations"
            />
            <kbd>/</kbd>
          </label>
          {query.trim() ? (
            <section className="search-results" aria-label="Search results">
              <div className="section-label">
                {results.length} RESULTS{" "}
                <button className="text-button" onClick={() => setQuery("")}>
                  Clear
                </button>
              </div>
              {results.map((n) => (
                <button
                  className="location-row"
                  key={n.id}
                  onClick={() => navigate(n.id)}
                >
                  <Glyph kind={n.kind} />
                  <span>
                    {n.name}
                    <small>
                      {ancestry(n)
                        .slice(0, -1)
                        .map((p) => p.name)
                        .join(" / ") || labels[n.kind]}
                    </small>
                  </span>
                </button>
              ))}
              {!results.length && (
                <p className="empty">
                  No known locations match. Try another name.
                </p>
              )}
            </section>
          ) : (
            <>
              <nav className="atlas-tree" aria-label="Location hierarchy">
                {path.map((n, index) => (
                  <button
                    className={`tree-row ${n.id === selected.id ? "active" : ""}`}
                    key={n.id}
                    style={{ paddingLeft: `${12 + index * 8}px` }}
                    onClick={() => navigate(n.id)}
                    aria-current={n.id === selected.id ? "location" : undefined}
                  >
                    <Glyph kind={n.kind} />
                    <span>
                      {n.name}
                      <small>{labels[n.kind]}</small>
                    </span>
                    <span className="row-arrow" aria-hidden="true">
                      {n.id === selected.id ? "−" : "↗"}
                    </span>
                  </button>
                ))}
                {children.map((n) => (
                  <button
                    className="tree-row child-row"
                    key={n.id}
                    onClick={() => navigate(n.id)}
                  >
                    <Glyph kind={n.kind} />
                    <span>
                      {n.name}
                      <small>{labels[n.kind]}</small>
                    </span>
                    <span className="row-arrow" aria-hidden="true">
                      ›
                    </span>
                  </button>
                ))}
              </nav>
              <div className="navigator-bottom">
                <div className="section-label">THE ORDER OF THINGS</div>
                <p>
                  Resonance <span>→</span> Wish & Hollow <span>→</span> Planes{" "}
                  <span>→</span> Galaxies <span>→</span> Systems <span>→</span>{" "}
                  Worlds
                </p>
                <small>{atlas.nodes.length} published locations</small>
              </div>
            </>
          )}
        </aside>
        <main id="atlas-content" className="atlas-main">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            {path.map((n, index) => (
              <span key={n.id}>
                {index > 0 && <i aria-hidden="true">/</i>}
                <button
                  onClick={() => navigate(n.id)}
                  aria-current={n.id === selected.id ? "page" : undefined}
                >
                  {n.name}
                </button>
              </span>
            ))}
          </nav>
          {!byId.has(selectedId) && (
            <p role="status" className="link-notice">
              That location is not in this edition. You’re viewing the
              Resonance.
            </p>
          )}
          <div className="view-heading">
            <div>
              <div className="eyebrow">
                HISTORY’S RETRIBUTION / {labels[selected.kind].toUpperCase()}
              </div>
              <h1 ref={heading} tabIndex={-1}>
                {selected.name}
              </h1>
            </div>
            <button
              className="outline-button"
              onClick={() =>
                selected.parentId
                  ? navigate(selected.parentId)
                  : navigate(root.id)
              }
            >
              {selected.parentId ? "↖ Up one level" : "✧ Atlas home"}
            </button>
          </div>
          <CosmicMap
            selected={selected}
            children={children}
            navigate={navigate}
          />
          <section className="within" aria-label="Locations in this view">
            <div className="within-heading">
              <h2>
                {selected.kind === "planet"
                  ? "At the edge of this survey"
                  : "Within this expanse"}
              </h2>
              <span>
                {children.length}{" "}
                {children.length === 1 ? "location" : "locations"}
              </span>
            </div>
            {children.length ? (
              <div className="location-grid">
                {children.map((n) => (
                  <button
                    className="location-card"
                    key={n.id}
                    onClick={() => navigate(n.id)}
                  >
                    <Glyph kind={n.kind} />
                    <span>
                      <small>{labels[n.kind]}</small>
                      <strong>{n.name}</strong>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty">
                {selected.kind === "planet"
                  ? "This world is the deepest level of the current atlas."
                  : "No locations have been published within this expanse yet."}
              </p>
            )}
          </section>
        </main>
        <aside className="dossier" aria-label="Location details">
          <div className="section-label">
            FIELD NOTES <span>✧</span>
          </div>
          <div className="dossier-emblem">
            <Glyph kind={selected.kind} large />
          </div>
          <div className="eyebrow">{labels[selected.kind]}</div>
          <h2>{selected.name}</h2>
          <div className="gold-rule" />
          <p className="description">
            {selected.summary ||
              "No account of this location has been published yet."}
          </p>
          <dl>
            <div>
              <dt>Belongs to</dt>
              <dd>
                {selected.parentId
                  ? byId.get(selected.parentId)!.name
                  : "The cosmic atlas"}
              </dd>
            </div>
            <div>
              <dt>Known locations within</dt>
              <dd>{children.length}</dd>
            </div>
            <div>
              <dt>Edition</dt>
              <dd>{atlas.demo ? "Demonstration survey" : atlas.edition}</dd>
            </div>
          </dl>
          <button className="outline-button share-button" onClick={copyLink}>
            {copied ? "Link copied ✓" : "Copy location link ↗"}
          </button>
          <p role="status" className="copy-status">
            {copied
              ? "Ready to share with your party."
              : "You can also share this page’s address."}
          </p>
        </aside>
      </div>
      <footer>
        <span>
          HISTORY’S RETRIBUTION <span aria-hidden="true">✧</span> A record of
          the known cosmos
        </span>
        <span>Read. Explore. Discover.</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
