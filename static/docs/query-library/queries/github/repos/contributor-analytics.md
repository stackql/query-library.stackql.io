---
title: GitHub contributor ranking and concentration
description: Ranks a repository's contributors by commit count with running totals and share of the whole; the bus-factor and contribution concentration view.
verb: select
status: stable
providers: [github]
services: [repos]
tags: [github, repos, analytics, contributors, community]
keywords: [contributor ranking, bus factor, contribution concentration, top contributors, window functions]
intent_keywords:
  - who are the top contributors to this repo
  - how concentrated are contributions
  - rank contributors by commits
auth: [STACKQL_GITHUB_USERNAME, STACKQL_GITHUB_PASSWORD]
params:
  - name: owner
    type: identifier
    required: true
    description: Repository owner (organization or user)
    example: stackql
  - name: repo
    type: identifier
    required: true
    description: Repository name
    example: stackql
outputs:
  - name: login
    type: string
    description: Contributor login
  - name: contributions
    type: integer
    description: Commit count attributed to the contributor
  - name: contribution_rank
    type: integer
    description: Dense position by contribution count, ties sharing a rank
  - name: running_total
    type: integer
    description: Cumulative contributions down the ranking
  - name: total_contributions
    type: integer
    description: Repository-wide total, repeated on every row
  - name: pct_of_total
    type: number
    description: This contributor's share of all contributions, as a percentage
cost:
  fan_out: none
  expensive: false
related:
  - github/repos/commit-activity-trend
  - github/repos/release-cadence
  - github/repos/org-repos-list
last_verified: "2026-07-29"
---

Ranks a repository's contributors by commit count and shows how concentrated
the contributions are. The running total and percentage share answer the bus
factor question directly: if the top one or two logins account for most of
the total, the project has a single-maintainer risk.

## Query

```sql
SELECT
login,
contributions,
DENSE_RANK() OVER (ORDER BY contributions DESC) as contribution_rank,
SUM(contributions) OVER (ORDER BY contributions DESC) as running_total,
SUM(contributions) OVER () as total_contributions,
ROUND(100.0 * contributions / SUM(contributions) OVER (), 2) as pct_of_total
FROM github.repos.contributors
WHERE owner = '{{owner}}'
AND repo = '{{repo}}';
```

## Variation: contributor tiers

NTILE splits the ranking into quartiles, which is a stable way to label
contributors without hardcoding thresholds:

```sql
SELECT
login,
contributions,
NTILE(4) OVER (ORDER BY contributions DESC) as contribution_quartile,
CASE NTILE(4) OVER (ORDER BY contributions DESC)
    WHEN 1 THEN 'Top Contributors'
    WHEN 2 THEN 'Active Contributors'
    WHEN 3 THEN 'Moderate Contributors'
    WHEN 4 THEN 'Occasional Contributors'
END as contributor_tier
FROM github.repos.contributors
WHERE owner = '{{owner}}'
AND repo = '{{repo}}';
```

## Variation: ranking functions compared

The three ranking functions differ only in how they treat ties, which
matters when several contributors share a commit count:

```sql
SELECT
login,
contributions,
RANK() OVER (ORDER BY contributions DESC) as rank,
DENSE_RANK() OVER (ORDER BY contributions DESC) as dense_rank,
ROW_NUMBER() OVER (ORDER BY contributions DESC) as row_num,
ROUND(PERCENT_RANK() OVER (ORDER BY contributions), 3) as percentile
FROM github.repos.contributors
WHERE owner = '{{owner}}'
AND repo = '{{repo}}';
```

## Notes

running_total uses the default window frame, which includes all peer rows at
the same contribution count, so tied contributors share an identical running
total and the column jumps rather than incrementing one row at a time - that
is correct SQL, not a defect, but it makes the column unsuitable as a
sequence number. Use ROW_NUMBER for that. RANK leaves gaps after a tie while
DENSE_RANK does not, and ROW_NUMBER breaks ties arbitrarily; the template
uses DENSE_RANK so equal contributors read as equal. PERCENT_RANK orders
ascending, so the largest contributor scores 1. The contributors endpoint
counts commits to the default branch only and excludes merge commits, so the
totals will not match a repository's full commit history. Anonymous
contributors are omitted unless requested.
