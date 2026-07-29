---
title: GitHub repositories in an organization
description: Lists all repositories in a GitHub organization with visibility, archive state and activity signals, filtered and sorted server-side.
verb: select
status: stable
providers: [github]
services: [repos]
tags: [github, repos, inventory]
keywords: [repo list, org repositories, repository inventory, stale repos, forks]
intent_keywords:
  - list repos in my github org
  - what repositories does the organization have
  - github repository inventory
auth: [STACKQL_GITHUB_USERNAME, STACKQL_GITHUB_PASSWORD]
params:
  - name: org
    type: identifier
    required: true
    description: GitHub organization login
    example: stackql
  - name: repo_type
    type: enum
    required: false
    default: all
    enum: [all, public, private, forks, sources, member]
    description: Server-side repository filter; sources excludes forks, member excludes org-owned
    example: sources
outputs:
  - name: name
    type: string
    description: Repository name
  - name: full_name
    type: string
    description: org/name form
  - name: visibility
    type: string
    description: public, private or internal
  - name: archived
    type: boolean
    description: True when the repository is archived
  - name: fork
    type: boolean
    description: True when the repository is a fork
  - name: default_branch
    type: string
    description: Default branch name
  - name: pushed_at
    type: string
    description: Last push timestamp (staleness signal)
  - name: stargazers_count
    type: integer
    description: Star count
  - name: open_issues_count
    type: integer
    description: Open issues and pull requests
cost:
  fan_out: none
  expensive: false
  notes: Paginated transparently; one request per 100 repositories
author: Jeffrey Aven
author_company: StackQL Studios
last_verified: "2026-07-29"
---

Lists every repository in a GitHub organization with the fields that answer
most governance asks: visibility, archive state, fork status, default branch
and last-push recency. The repository filter is applied server-side by the
API rather than in SQL, so narrow the result with repo_type instead of
filtering the full list client-side.

## Query

```sql
SELECT
name,
full_name,
visibility,
archived,
fork,
default_branch,
pushed_at,
stargazers_count,
open_issues_count
FROM github.repos.repos
WHERE org = '{{org}}'
AND type = '{{repo_type}}'
AND per_page = 100;
```

## Variation: least recently pushed first

sort and direction are server-side parameters, so the API returns the rows
already ordered - useful for finding abandoned repositories:

```sql
SELECT name, visibility, archived, pushed_at, stargazers_count
FROM github.repos.repos
WHERE org = '{{org}}'
AND sort = 'pushed'
AND direction = 'asc'
AND per_page = 100;
```

## Variation: staleness in days

Compute an age from pushed_at and exclude archived repositories, which are
stale by design:

```sql
SELECT name, pushed_at, days_since_push FROM (
SELECT name, pushed_at, archived,
ROUND(julianday('now') - julianday(pushed_at)) as days_since_push
FROM github.repos.repos
WHERE org = '{{org}}'
AND per_page = 100
) t WHERE archived = 0;
```

## Notes

Predicate pushdown is not wired for this provider, so a WHERE clause on an
output column such as visibility or fork is applied client-side after every
page has been fetched. Use the API's own filter parameters where they exist:
type accepts all, public, private, forks, sources and member, and sources
excludes forks server-side. sort accepts created, updated, pushed and
full_name, with direction asc or desc. Pagination is wired: per_page sets
the page size only, and stackql follows the pagination links and returns
every repository regardless of the value, so per_page = 100 minimises
requests rather than capping results. Unauthenticated calls see only public
repositories and are heavily rate limited; authenticate with a personal
access token as STACKQL_GITHUB_PASSWORD to see private and internal
repositories. Boolean columns compare as 1 and 0, not the strings true and
false.
