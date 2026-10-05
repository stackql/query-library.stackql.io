# CLAUDE.md - query-library.stackql.io

Project guide for Claude Code working in this repository.

## What this repo is

The StackQL query library and the minimal Docusaurus 3 site that publishes it.
The repo has one purpose: to master and serve ground truth StackQL queries -
to the stackql MCP server's tool surface (`query_library_search` /
`query_library_get`, via CDN with raw GitHub as fallback) and to humans via
the microsite. Entries are treated as authoritative by agents, so correctness
outranks coverage. It was carved out of the main stackql.io repo; everything
here exists to serve one content surface:
`https://stackql.io/docs/query-library/*`.

The repo deploys as its own Netlify site (origin `query-library.stackql.io`)
but is **served through the main site's proxy rewrite**. The stackql.io repo's
netlify.toml contains:

```toml
[[redirects]]
  from = "/docs/query-library/*"
  to = "https://query-library.stackql.io/:splat"
  status = 200
  force = true
```

The proxy strips the prefix, so this origin answers at its root. That drives
the two most load-bearing values in the repo, in
[docusaurus.config.js](docusaurus.config.js):

```js
url: 'https://stackql.io',            // canonical public origin - NOT the subdomain
baseUrl: '/docs/query-library/',      // must equal the proxy prefix, forever
```

Consequences:

- Every emitted link, asset path and canonical URL carries the
  `/docs/query-library/` prefix, so pages work when proxied.
- Browsing the raw subdomain or a Netlify deploy preview directly works
  too, by two cooperating pieces: a non-forced 200 rewrite in
  [netlify.toml](netlify.toml) maps the prefixed asset and page paths the
  HTML emits back to the origin root, and an inline head script
  (`headTags` in docusaurus.config.js) sends a prefix-less pathname to the
  prefixed URL before render, because the client router only knows routes
  under baseUrl and would otherwise swap the server-rendered page for Not
  Found on hydration. The proxy never sends prefixed paths and the browser
  URL there always carries the prefix, so neither piece fires in
  production. Canonicalisation is via the `<link rel="canonical">` tags
  Docusaurus emits, not redirects. The origin must answer 200 to the proxy
  - never add a server-side redirect from the root here.
- The committed machine artifacts land in the build at
  `build/docs/query-library/` (static copy) while HTML lands at the build
  root; [netlify.toml](netlify.toml) has non-forced 200 rewrites that surface
  the artifacts at the origin root paths the proxy delivers
  (`/manifest.json`, `/index.json`, `/index.md`, `/providers.json`,
  `/queries/*`). Real files (HTML pages, AEO `.md` companions) shadow the
  rewrites.

## The query library

`query-library/` masters the library: entries are Markdown with YAML front
matter under `query-library/queries/<family>/<service>/<slug>.md`, where
`<family>` is the provider *family* directory (`aws` covers the `aws` and
`awscc` providers, `databricks` covers `databricks_account` and
`databricks_workspace`; map in `src/configs/provider-families.json`, shared
by validation and the site components) and front matter `providers` names the
actual StackQL providers the template references; a Python
build step (`query-library/scripts/build-artifacts.py`) compiles them into
committed artifacts under `static/docs/query-library/` (index.json, index.md,
manifest.json, providers.json, per-query .json and .md). The Netlify build
command also regenerates the artifacts at deploy time (belt and braces - a
stale commit deploys correctly anyway; the committed files stay authoritative
for the raw-GitHub fallback tier and the PR freshness gate flags staleness).

The human surface has three levels, all in the single `query-library`
docs-plugin instance (routeBasePath `/`, so public routes sit directly under
baseUrl):

- landing page `/docs/query-library`: the handwritten
  [query-library/index.mdx](query-library/index.mdx) mounts `LandingContent`,
  which builds the provider card grid from the generated
  `static/docs/query-library/providers.json` + `index.json` (no
  hand-maintained provider list).
- provider family pages `/docs/query-library/<family>`: generated
  `query-library/<family>.mdx` stubs (written by build-artifacts.py,
  marker-guarded, stale ones deleted) mount `ProviderContent`. Provider
  titles/blurbs come from
  [src/configs/providers-data.json](src/configs/providers-data.json) (shared
  by the sidebar and the python build); logos resolve favicon-first from
  `static/img/providers/<p>/` (`favicon.svg|png|ico`, then `<p>.png`, with
  `_account`/`_workspace` falling back to the base brand dir). Components
  resolve the emitted root-relative logo paths through `useBaseUrl`.
- query pages `/docs/query-library/queries/<id>`: docs-rendered, with a
  `DocItem/Content` theme wrapper
  ([src/theme/DocItem/Content](src/theme/DocItem/Content/index.js)) adding the
  front-matter-driven metadata panel and related-entries footer on query
  pages only (components in
  [src/components/QueryLibrary/](src/components/QueryLibrary/)).

[sidebars-query-library.js](sidebars-query-library.js) builds the sidebar
dynamically: a back link to the main stackql.io docs, Overview, then a
category per family directory (label from providers-data.json, link to the
family stub, children autogenerated from `queries/<family>/`).

`markdown.format: 'detect'` in docusaurus.config.js parses `.md` entries as
CommonMark and the `.mdx` stubs as MDX. This is load-bearing: entry prose can
contain `{{placeholders}}` and literal JSON braces, which MDX treats as
expressions and fails on, and a top-level `format` front matter key does NOT
override the parser (only nested `mdx.format` does - the old `format: md`
front matter this repo once carried was inert). Never hand-edit
`static/docs/query-library/`; regenerate it. The contributor-facing guide is
[CONTRIBUTING.md](CONTRIBUTING.md) at the repo root.

## Authoring queries (the non-obvious constraints)

Read [CONTRIBUTING.md](CONTRIBUTING.md) first; these are the rules that are
easy to get wrong:

- Front matter must NOT contain an `id` key (Docusaurus reserves it; the
  build derives the id from the file path).
- The first ` ```sql ` fence after `## Query` is extracted verbatim as the
  template. Exactly one statement, terminated with `;`.
- The `## Notes` section is flattened to a single prose string in the JSON.
  No lists, no code fences, no headings inside it.
- `verb` must match the statement: `select` for SELECT, `mutation` for
  INSERT/UPDATE/DELETE/REPLACE, `lifecycle` for EXEC.
- Only author queries verified against the provider docs or a live stackql
  instance (the stackql MCP tools `describe_resource` and
  `validate_select_query` are the fastest check). Wrong field names poison
  agent retrieval downstream. New unverified entries stay `status: draft`.
- `permissions` is provider-native IAM action syntax (`iam:ListUsers`,
  `Microsoft.Compute/virtualMachines/read`, `compute.instances.list`) and
  must list only what the template's wire calls require. Omit the field when
  unsure - agents relay it verbatim as 403 remediation, so a wrong list is
  worse than none. AWS entries backed by Cloud Control (the `awscc` provider)
  need the `cloudformation:*` action for the wire call
  (`cloudformation:ListResources`, `cloudformation:GetResource`,
  `cloudformation:UpdateResource`, ...) plus the underlying service actions -
  Cloud Control API authorizes under the `cloudformation:` prefix; there is
  no `cloudcontrol:` IAM prefix.
- Write `intent_keywords` as user asks, not as descriptions ("list all s3
  buckets", not "s3 bucket enumeration").

## Site chrome (must look identical to stackql.io)

The navbar, footer and every cross-site link come from the shared StackQL
chrome repo, `stackql/docusaurus-config` (local checkout
`../docusaurus-config`), which also drives the provider microsites. The
`vendor-config` script in package.json shallow-clones its `main` into the
gitignored `.shared-config/` before every `yarn start`/`yarn build` (Yarn 1
runs the pre-scripts, so the Netlify build is covered). A failed clone fails
the build by design, and `main` is unpinned, so a shared change goes live on
this site's next build. This site cannot use the shared `createConfig`
factory (it assumes a microsite at baseUrl `/` with its own preset), so
[docusaurus.config.js](docusaurus.config.js) composes the pieces instead:
`buildNavbar()`/`buildFooter()` for the chrome (logo href overridden to the
brand home; `selfUrl` tells the shared code that AI Agents > Query Library
is this site, so it becomes an internal link and its redirect route is not
registered - that page would build to `docs/query-library.html`, which
Netlify's pretty URLs would serve in place of the baseUrl root on direct
hits), `redirectsPlugin` for the main-site destinations
(one local route under baseUrl per link that client-side-forwards to the
real page, so links are internal here: no external-link icon, they pass the
broken-link checker, and they work on localhost and on the raw subdomain)
and `redirectRoutes(baseUrl)` to keep those stub routes out of the sitemap
and of structured-data JSON-LD. The shared Redirect pages carry a canonical
to their target and a zero-second meta refresh and are deliberately not
noindexed (noindex plus canonical is a contradictory signal, and a redirect
is never indexed). There are no `src/pages/` stubs; menu changes belong in the shared
repo, whose README documents the composition contract ("Composing instead
of createConfig") and whose menus must be kept in step with the main site's
navbar/footer. The footer is the swizzled main-site footer
(`src/theme/Footer`, needs `@iconify/react`, `@mui/material`, `clsx`);
`src/css/global.css` is the full main-site stylesheet for visual parity.
DocSearch is enabled only when the `ALGOLIA_*` env vars are set (shared
'stackql' index - set them on Netlify; local builds need none).

## Contract notes (breaking to change - deployed MCP servers depend on them)

- Public URL paths under `https://stackql.io/docs/query-library/` and the
  raw GitHub fallback path `static/docs/query-library/` in this repo
  (machine paths manifest.json, index.json, queries/<id>.json and
  queries/<id>.md are frozen; human HTML routes may be restructured only if
  `doc_url` emission in build-artifacts.py is updated to match)
- placeholder syntax `{{name}}` with names matching `[A-Za-z0-9_]+`; param
  types `string`, `number`, `boolean`, `identifier`, `enum`
- the `<id>.json` field set (see any file under
  `static/docs/query-library/queries/`); keep the emitted JSON shape in
  lockstep with the reference implementation in the core repo
  (`pkg/mcp_server/content/query_library/`, consumed by
  `pkg/mcp_server/query_library.go`)
- `build_id` in manifest.json is a content hash of the library, not the site
  build id; it must change when and only when library content changes
- entry ids are permanent (path-derived, `family/service/slug`)
- index.json entries carry `verb` in addition to the contract fields
  (additive only - the MCP server ignores unknown fields; the provider pages
  read it for badges)
- queries/<id>.json carries optional `author`/`author_company` attribution
  fields when set in front matter (additive only, same rationale; the query
  page renders them as "Contributed by")
- `doc_url` emission stays `https://stackql.io/docs/query-library/queries/<id>`
  (`SITE_BASE_URL` in query-library/scripts/qlib.py)

## AEO plugins (retained from the main site)

- `@stackql/docusaurus-plugin-structured-data` - JSON-LD on every page;
  `TechArticle` on `/docs/`-prefixed routes (all query pages). Source in the
  sibling repo `../docusaurus-plugin-structured-data`. This site requires
  >= 1.5.1 (1.5.0 resolved built HTML paths without stripping baseUrl, so
  on this site's non-root baseUrl it silently emitted nothing; fixed in the
  sibling repo and pinned here as ^1.5.1).
- `@stackql/docusaurus-plugin-aeo` - `.md` companions for query pages,
  `llms.txt` + `llms-full.txt` at the origin root (public URLs
  `stackql.io/docs/query-library/llms.txt` etc.), and the Ask AI dropdown
  on doc pages. Source in the sibling repo `../docusaurus-plugin-aeo`. The
  landing and provider MDX stubs are excluded from companions/llms.txt via
  `companions.exclude` (they are component mounts, not content); query
  pages keep their companions. `@mui/icons-material` stays in package.json
  solely as this plugin's peer dependency.

Both plugins run in `postBuild`, so `yarn start` shows neither JSON-LD nor
companions - use `yarn build && yarn serve` to verify the full pipeline.

Note a quirk in the AEO plugin: it writes `.md` companions at the permalink
path under the build dir, which on this site is
`build/docs/query-library/queries/<id>.md` - the same location Docusaurus
copies the committed artifact to. Today both are byte-identical mirrors of
the raw source, so the overwrite is harmless; do not switch
`companions.format` to `'plain'` here or the deployed contract `.md` would
silently diverge from the committed artifact.

## CI

- `.github/workflows/query-library-ci.yml` - per PR: schema validation,
  artifact freshness gate (build must produce no diff), stackql parse check.
- `.github/workflows/query-library-nightly.yml` - nightly live verification
  against sandbox credentials; commits updated `last_verified` artifacts.

## Useful commands

```bash
# Library pipeline
python query-library/scripts/validate.py
python query-library/scripts/build-artifacts.py

# Optional commit-time enforcement of the two commands above
# (.pre-commit-config.yaml; per-clone opt-in)
pip install pre-commit && pre-commit install

# Site (no env vars needed)
yarn start      # dev server - no postBuild AEO outputs, no JSON-LD
yarn build      # full production build
yarn serve      # serve build/ locally; pages at /docs/query-library/

# Inspect emitted JSON-LD on a query page
grep -l 'TechArticle' build/queries/aws/*/*.html | head

# Check llms.txt structure
head -20 build/llms.txt
```

## When you make changes

- After any change under `query-library/queries/`, run validate + build and
  commit the regenerated `static/docs/query-library/` files in the same
  commit (CI freshness gate).
- Never reintroduce main-site content (docs, blog, marketing pages) here;
  that all lives in the stackql.io repo.
- If you touch `url`/`baseUrl` or the netlify.toml rewrites, the main repo's
  proxy redirect must be updated in the same release - they are one contract.
