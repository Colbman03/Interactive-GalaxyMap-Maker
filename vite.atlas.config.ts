import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePublicAtlas } from "./atlas/schema.ts";

const atlasRoot = fileURLToPath(
  new URL("./atlas/", import.meta.url),
).replaceAll("\\", "/");
const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'
  Cache-Control: no-cache
`;

export default defineConfig({
  root: atlasRoot,
  // Never copy the legacy public/ folder, private drafts, or arbitrary static assets.
  publicDir: false,
  envDir: false,
  plugins: [
    react(),
    {
      name: "public-atlas-boundary",
      buildStart() {
        parsePublicAtlas(
          JSON.parse(
            readFileSync(
              new URL("./atlas/content/published-atlas.json", import.meta.url),
              "utf8",
            ),
          ),
        );
      },
      generateBundle(_options, bundle) {
        for (const output of Object.values(bundle)) {
          if (output.type !== "chunk") continue;
          for (const original of Object.keys(output.modules)) {
            const id = original.replaceAll("\\", "/");
            if (id.startsWith("\0") || id.includes("/node_modules/")) continue;
            if (!id.startsWith(atlasRoot))
              this.error("Player bundle imported a module outside atlas/.");
          }
        }
        this.emitFile({ type: "asset", fileName: "_headers", source: headers });
      },
    },
  ],
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
  preview: { host: "127.0.0.1", port: 4174, strictPort: true },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
  },
});
