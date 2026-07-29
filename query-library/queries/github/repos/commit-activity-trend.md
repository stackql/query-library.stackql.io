---
title: GitHub weekly commit activity trend
description: Reports the last year of weekly commit counts with a four-week moving average and cumulative total; the project momentum view.
verb: select
status: stable
providers: [github]
services: [repos]
tags: [github, repos, analytics, activity, delivery]
keywords: [commit activity, moving average, project momentum, weekly commits, trend]
intent_keywords:
  - how active is this repository
  - commit trend over time
  - weekly commit activity
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
  - name: week_starting
    type: string
    description: Date the week begins (weeks start Sunday, UTC)
  - name: commits
    type: integer
    description: Commits in that week
  - name: four_week_moving_avg
    type: number
    description: Mean weekly commits over this week and the three before it
  - name: cumulative_commits
    type: integer
    description: Running total across the reported period
cost:
  fan_out: none
  expensive: false
  notes: One call; GitHub computes the statistic asynchronously and may return empty on first request
related:
  - github/repos/contributor-analytics
  - github/repos/release-cadence
last_verified: "2026-07-29"
---

Reports the trailing year of weekly commit counts for a repository, smoothed
with a four-week moving average. The raw weekly count is noisy - a single
large merge distorts it - so the moving average is the column to read for
momentum, with the cumulative total giving the period's overall volume.

## Query

```sql
SELECT
date(week, 'unixepoch') as week_starting,
total as commits,
ROUND(AVG(total) OVER (ORDER BY week ROWS BETWEEN 3 PRECEDING AND CURRENT ROW), 1) as four_week_moving_avg,
SUM(total) OVER (ORDER BY week) as cumulative_commits
FROM github.repos.stats_commit_activity
WHERE owner = '{{owner}}'
AND repo = '{{repo}}';
```

## Variation: day-of-week distribution

The days array holds seven daily counts per week, Sunday first. Exploding it
shows which days the project actually ships on:

```sql
SELECT
date(week, 'unixepoch') as week_starting,
json_extract(days, '$[0]') as sun,
json_extract(days, '$[1]') as mon,
json_extract(days, '$[2]') as tue,
json_extract(days, '$[3]') as wed,
json_extract(days, '$[4]') as thu,
json_extract(days, '$[5]') as fri,
json_extract(days, '$[6]') as sat
FROM github.repos.stats_commit_activity
WHERE owner = '{{owner}}'
AND repo = '{{repo}}';
```

## Notes

The resource already exposes a per-week total, so there is no need to sum the
days array to get a weekly count - and doing so via JSON_EACH is actively
worse here, because a predicate sitting in the same WHERE clause as a table
function is dropped, which silently returns an empty result rather than an
error. week is a Unix timestamp for the Sunday the week begins; convert it
with date(week, 'unixepoch'). The window frame ROWS BETWEEN 3 PRECEDING AND
CURRENT ROW gives a trailing four-week mean, and the first three rows average
over fewer weeks by design. GitHub computes repository statistics
asynchronously and returns an empty body with a 202 on the first request for
a cold repository, so an empty result may simply mean the statistic is still
being generated - retry before concluding the repository is inactive. The
series covers the last year only.
