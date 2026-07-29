# query-library.stackql.io

The StackQL query library: curated, parameterized, known-good StackQL queries
for cloud inventory, security and operations, published at
[stackql.io/docs/query-library](https://stackql.io/docs/query-library) and
consumed by the stackql MCP server's `query_library_search` /
`query_library_get` tools.

This repo builds and deploys as its own Netlify site, but is served to the
public through the main stackql.io site's proxy rewrite at
`https://stackql.io/docs/query-library/*`. The Docusaurus `url` + `baseUrl` in
[docusaurus.config.js](docusaurus.config.js) and the redirect in the stackql.io
repo's `netlify.toml` must agree - see the comments in both files. Browsing
the raw subdomain directly shows broken asset paths; that is expected, the
canonical URLs live on stackql.io.

## Layout

- `query-library/` - the library sources: Markdown entries with YAML front
  matter under `queries/<family>/<service>/<slug>.md` (provider family
  directories - e.g. `aws` covers both the `aws` and `awscc` providers,
  `databricks` covers `databricks_account` and `databricks_workspace`), plus
  schema, scripts
  and templates. See [CONTRIBUTING.md](CONTRIBUTING.md).
- `static/docs/query-library/` - committed, script-generated artifacts
  (`manifest.json`, `index.json`, `index.md`, per-query `.json`/`.md`). Never
  hand-edit; regenerate with the build script. The path is a frozen contract
  surface (raw-GitHub fallback tier for MCP servers).
- `src/` - the minimal Docusaurus shell: query library React components, the
  `DocItem/Content` theme wrapper and global CSS.
- `.github/workflows/` - per-PR validation and artifact freshness gate
  (`query-library-ci.yml`) and nightly live verification
  (`query-library-nightly.yml`).

## Working on the library

```bash
python query-library/scripts/validate.py
python query-library/scripts/build-artifacts.py
```

Commit regenerated `static/docs/query-library/` files together with the source
change - CI fails the PR if they are stale.

## Working on the site

```bash
yarn            # install
yarn start      # dev server (renders at localhost:3000/docs/query-library/)
yarn build      # production build into build/
yarn serve      # serve the production build
```

No environment variables are required to build.
