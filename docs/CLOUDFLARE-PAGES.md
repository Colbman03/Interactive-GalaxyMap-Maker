# Deploy the player atlas to Cloudflare Pages

This PR prepares a static build. It does not create a Cloudflare project, connect GitHub, change DNS, or deploy anything. No Cloudflare token is needed in this repository.

## Actions for the account owner

1. Review and merge the atlas PR into this fork’s `main` when ready. The old `main` still builds the original editor; do not publish that version as the player atlas. If you need a hosted preview before merging, use the direct-upload option below or explicitly build the PR branch in a separate preview project.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git** (labels may vary). Authorize the Cloudflare GitHub integration for `Colbman03/Interactive-GalaxyMap-Maker`, then select that repository.
3. Use these build settings:

| Setting | Value |
| --- | --- |
| Production branch | `main`, after the atlas PR is merged |
| Framework preset | None (or React/Vite with the values below) |
| Root directory | Repository root; leave blank |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `24` (`.node-version`, or `NODE_VERSION=24` in the dashboard) |
| Campaign secrets / API keys | None |

4. Deploy and check the resulting `pages.dev` URL. It should show **History’s Retribution / Cosmic Atlas / Player edition**, with the sample survey notice until canon is curated. Do not select `dist-gm`, `src`, `public`, or the repository root as the output directory.
5. Under the Pages project’s **Custom domains → Set up a domain**, enter the desired HR hostname. A subdomain such as `atlas.<your-HR-domain>` is a useful way to leave the existing HR homepage in place. The exact HR domain has not yet been supplied. Add the domain through Pages first and follow its DNS instructions; an existing Cloudflare-managed zone normally gets the requested CNAME after confirmation. Avoid overwriting another service’s hostname.

Cloudflare’s current [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) and [custom domain instructions](https://developers.cloudflare.com/pages/configuration/custom-domains/) document these settings and DNS requirements. Apex domains require the zone in the same Cloudflare account; subdomains can use a CNAME.

## Review previews and audience

Once connected, pushes to non-production branches can create preview deployments; merging to the production branch updates the live domain. Check **Settings → Builds & deployments** for branch controls.

Cloudflare [preview URLs are public by default](https://developers.cloudflare.com/pages/configuration/preview-deployments/). Enable the project’s preview Access policy if you want restricted review links. That switch protects preview deployments only; it does not automatically protect the production `pages.dev` hostname or custom domain.

This initial player site is read-only but does not require player sign-in. If the atlas must be party-only, configure Cloudflare Access for the production hostname and address the alternate `pages.dev` route as well; verify access from a signed-out browser. Published content remains visible in this public GitHub fork, so website authentication alone cannot make committed lore private. Keep actual secrets outside the fork.

## Optional preview before merging

Run `npm ci` and `npm run build` on `codex/hr-cosmic-atlas`, then use a separate Cloudflare Pages **Direct Upload** project for the contents of `dist/` only. A separate preview project avoids publishing the legacy main branch. Use a Git-integrated project for the long-term site; [direct-upload projects cannot later switch to Git integration](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Updating the campaign

Author locally → export the approved snapshot with `atlas:publish` → inspect the diff → build → PR review → merge → Cloudflare rebuilds. Do not run `atlas:publish` on Cloudflare: cloud builds should never receive a GM draft. Old immutable preview URLs can remain accessible after a later release, so never put secrets in previews.

The original GM application also has pre-existing production compilation failures and no LICENSE file in the inspected source. See [the atlas guide](COSMIC-ATLAS.md) for scope and the upstream attribution before broader deployment.
