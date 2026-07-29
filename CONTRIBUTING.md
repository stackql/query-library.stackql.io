# Contributing to the StackQL Query Library

This repo has one purpose: to master and serve ground truth StackQL queries.
Every entry is treated as authoritative by AI agents (via the stackql MCP
server's `query_library_search` and `query_library_get` tools) and by humans
browsing [stackql.io/docs/query-library](https://stackql.io/docs/query-library).

New queries are the contribution we want most. If you have a StackQL query
that answers a real question - an inventory sweep, a security posture check,
a lifecycle operation - turn it into an entry and open a PR. The bar is
correctness, not volume: one verified query beats ten guessed ones. Wrong
field or resource names poison agent retrieval downstream, so only submit
queries you have verified against the provider docs or a live stackql
instance.

Contributions are attributed: add the optional `author` and/or
`author_company` front matter fields and the published query page credits you
("Contributed by") - see the authoring rules below.

## How the library works

Each entry is one Markdown file with YAML front matter under
`query-library/queries/`. A build step compiles all entries into the
artifacts the MCP server fetches (`index.json`, `manifest.json`, per-query
`.json` and `.md` files) under `static/docs/query-library/`. Generated
artifacts are committed so the raw GitHub fallback tier works without a site
deploy, and the Docusaurus site in this repo renders the same entries as the
human surface.

## Entry ids

The id of an entry is its path under `query-library/queries/` without the
`.md` extension, and it must have exactly three segments:
`family/service/slug`, for example `aws/ec2/regions-enabled`. Segments are
lowercase `a-z0-9_-`.

The first segment is the provider *family* - the brand users and agents think
of, not necessarily a literal StackQL provider name. `aws` holds entries for
both the `aws` and `awscc` providers; `databricks` holds entries for
`databricks_account` and `databricks_workspace`. Front matter `providers`
names the actual StackQL provider(s) the template references; validation maps
`providers[0]` to its family (map in `src/configs/provider-families.json`,
shared with the site components) and requires it to match the directory.
Extend that map when a new multi-provider family arrives.

Ids are permanent. They are cached by MCP servers and referenced by `related`
lists. To rename an entry, add the new file and flip the old one to
`status: deprecated` with a note pointing at the replacement. Never delete or
move a published id.

## Authoring an entry

1. Copy `query-library/templates/query-template.md` to
   `query-library/queries/<family>/<service>/<slug>.md`.
2. Fill in the front matter. `query-library/schema/front-matter.schema.json`
   is the source of truth for every field; the main rules are:
   - `verb` routes execution: `select`, `mutation` or `lifecycle`.
   - `intent_keywords` is the primary retrieval field. Write them exactly as users
     phrase asks ("list all s3 buckets", "is my bucket public").
   - Every `{{placeholder}}` in the template must be declared in `params`, and
     every declared param must appear in the template.
   - Params without a `default` need an `example`; CI uses it to render the
     template for the parse check.
   - `permissions` (optional) lists the provider-native authorization actions
     the template's wire calls require - distinct from `auth`, which names the
     credential env vars for identity. Use the provider's own IAM syntax
     exactly: AWS `service:Action`, Azure `Microsoft.<RP>/<type>/<verb>`, GCP
     `service.resource.verb`. Declare only what the calls actually need (this
     feeds least-privilege policy generation, so over-declaration defeats its
     purpose), and when unsure omit the field entirely - a wrong permission
     list is worse than none, because agents relay it verbatim to operators as
     403 remediation guidance. AWS actions usually mirror the underlying API
     operation (ListUsers -> `iam:ListUsers`); entries that go through Cloud
     Control need both the `cloudcontrol:*` action and the underlying service
     actions.
   - `author` and `author_company` (optional, either or both) credit the
     contributor: they render as a "Contributed by" row on the query page and
     are carried in the emitted JSON. `author` is a personal display name,
     `author_company` an organization name.
   - Do not add an `id` key. The id is derived from the file path (`id` is a
     reserved Docusaurus front matter key).
3. Write the body:
   - one intro paragraph
   - a `## Query` section whose first ` ```sql ` fence is the template
   - an optional `## Notes` section (compact prose; it becomes the `notes` field
     in the emitted JSON)
4. New entries start as `status: draft`. Flip to `stable` once the query has been
   executed against a live provider (record the date in `last_verified`).

## Validating and building

```bash
pip install -r query-library/scripts/requirements.txt

# structural validation (schema, placeholder parity, ids, related refs)
python query-library/scripts/validate.py

# regenerate the published artifacts (run before committing)
python query-library/scripts/build-artifacts.py
```

Commit the regenerated files under `static/docs/query-library/` together with your
entry. CI fails the PR if the committed artifacts do not match the sources.

## What CI checks

Per PR:

- schema validation and placeholder/param parity in both directions
- unique ids and titles, `related` ids resolve
- template render check with the stackql binary (no execution)
- committed artifacts under `static/docs/query-library/` are up to date

Nightly:

- read-only (`verb: select`) stable entries are executed against sandbox
  credentials; `last_verified` is updated on success
- failing entries are flipped to `status: draft` and an issue is opened
- aspirational: run the read-only subset under a role built from each entry's
  declared `permissions` rather than a broad read-only role, turning the
  declaration into a tested claim (a 403 then means the declaration is
  incomplete and flags the entry, same as a functional failure)

## Human surface

The rendered site generates its browse pages from the built artifacts, so a
new provider or entry appears with no extra step once artifacts are rebuilt
(`build-artifacts.py` also writes the per-family `.mdx` stubs - commit them
with the artifacts; the CI freshness gate checks both):

- `/docs/query-library` - landing page with one card per provider family,
  driven by the generated `providers.json`
- `/docs/query-library/<family>` - entry table per provider family (generated
  `<family>.mdx` stub under `query-library/`)
- `/docs/query-library/queries/<id>` - the rendered entry, with a metadata
  panel (verb, providers, credentials, cost warning, last_verified) and
  related-entry links driven entirely by front matter

All three levels share the query library sidebar, generated per family
directory by `sidebars-query-library.js`.

For a proper display name and blurb on a brand-new family's card, add it to
`src/configs/providers-data.json` keyed by the family id; until then a
capitalized fallback renders. Logos resolve favicon-first from
`static/img/providers/<family>/` (`favicon.svg`, `favicon.png`, `favicon.ico`,
then `<family>.png`); drop a favicon file there to change the mark.
`_account`/`_workspace` suffixed ids fall back to the base brand directory.

## Publishing model

- `build_id` in `manifest.json` is a content hash of the compiled library, not the
  site build id. It changes when and only when library content changes, and MCP
  servers use it as their cache key.
- The site serves the artifacts at `https://stackql.io/docs/query-library/`
  (this repo deploys as its own Netlify site, proxied under that prefix by the
  main stackql.io site); the raw fallback is
  `https://raw.githubusercontent.com/stackql/query-library.stackql.io/main/static/docs/query-library/`.
  Both paths are contract surfaces for deployed MCP servers. Do not move them.
