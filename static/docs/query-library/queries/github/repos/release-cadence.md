---
title: GitHub release cadence and gaps
description: Lists a repository's releases with the previous and next tag alongside the interval between them; the shipping rhythm and release drought view.
verb: select
status: stable
providers: [github]
services: [repos]
tags: [github, repos, analytics, releases, delivery]
keywords: [release cadence, time between releases, release gap, shipping frequency, lag lead]
intent_keywords:
  - how often does this repo release
  - time between releases
  - when was the last release
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
  - name: tag_name
    type: string
    description: Release tag
  - name: name
    type: string
    description: Release title
  - name: published_at
    type: string
    description: Publication timestamp
  - name: previous_release
    type: string
    description: Tag of the preceding release, null for the earliest
  - name: next_release
    type: string
    description: Tag of the following release, null for the latest
  - name: days_since_last_release
    type: number
    description: Interval in days since the preceding release
cost:
  fan_out: none
  expensive: false
related:
  - github/repos/commit-activity-trend
  - github/repos/contributor-analytics
last_verified: "2026-07-29"
---

Lists a repository's releases in publication order with the tags either side
of each one and the interval since the previous release. Sorting by
days_since_last_release surfaces the droughts; scanning the recent rows shows
whether the current cadence is holding.

## Query

```sql
SELECT
tag_name,
name,
published_at,
LAG(tag_name, 1) OVER (ORDER BY published_at) as previous_release,
LEAD(tag_name, 1) OVER (ORDER BY published_at) as next_release,
ROUND(julianday(published_at) - julianday(LAG(published_at, 1) OVER (ORDER BY published_at)), 1) as days_since_last_release
FROM github.repos.releases
WHERE owner = '{{owner}}'
AND repo = '{{repo}}'
ORDER BY published_at DESC;
```

## Variation: first and latest release for context

FIRST_VALUE and LAST_VALUE need an explicit full frame - the default frame
ends at the current row, which would make LAST_VALUE return the current row
rather than the final one:

```sql
SELECT
tag_name,
published_at,
FIRST_VALUE(tag_name) OVER (ORDER BY published_at ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as first_release,
LAST_VALUE(tag_name) OVER (ORDER BY published_at ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as latest_release
FROM github.repos.releases
WHERE owner = '{{owner}}'
AND repo = '{{repo}}';
```

## Notes

days_since_last_release is null on the earliest release and next_release is
null on the latest, which is the expected boundary behaviour of LAG and LEAD
rather than missing data. Ordering is by published_at, not by tag name -
semantic version ordering would need parsing and does not always match
publication order, particularly where patch releases on an older line ship
after a newer minor. A value of 0 means two releases published on the same
day, which is common where a release is immediately superseded by a fix.
Draft releases are excluded by the API; pre-releases are included and carry
the prerelease flag, so filter on it if the cadence question is about stable
releases only. julianday date arithmetic is the embedded SQLite backend's
dialect.
