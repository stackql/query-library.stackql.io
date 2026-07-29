---
title: GitHub issue creation velocity
description: Sequences a repository's issues by creation date with a cumulative count and the gap since the previous issue; the intake rate and quiet-period view.
verb: select
status: draft
providers: [github]
services: [issues]
tags: [github, issues, analytics, velocity, community]
keywords: [issue velocity, issue growth, intake rate, backlog growth, time between issues]
intent_keywords:
  - how fast are issues being raised
  - issue growth over time
  - gaps between issue reports
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
  - name: state
    type: enum
    required: false
    default: all
    enum: [all, open, closed]
    description: Server-side state filter; the API defaults to open only, which understates intake
    example: all
outputs:
  - name: number
    type: integer
    description: Issue number
  - name: title
    type: string
    description: Issue title
  - name: state
    type: string
    description: open or closed
  - name: created_at
    type: string
    description: Creation timestamp
  - name: issue_sequence
    type: integer
    description: Position in creation order
  - name: cumulative_issues
    type: integer
    description: Running count of issues raised up to and including this one
  - name: days_since_prev_issue
    type: number
    description: Interval in days since the previously created issue
cost:
  fan_out: none
  expensive: false
  notes: Paginated transparently; one request per 100 issues
related:
  - github/repos/commit-activity-trend
  - github/repos/org-repos-list
---

Sequences a repository's issues in creation order with a running count and
the gap since the previous issue. Clusters of zero-day gaps mark bulk triage
or migration events rather than organic reports, while long gaps mark quiet
periods - both distort a naive issues-per-month average, which is why the
per-issue interval is more informative than a rate.

## Query

```sql
SELECT
number,
title,
state,
created_at,
ROW_NUMBER() OVER (ORDER BY created_at) as issue_sequence,
COUNT(*) OVER (ORDER BY created_at) as cumulative_issues,
ROUND(julianday(created_at) - julianday(LAG(created_at, 1) OVER (ORDER BY created_at)), 1) as days_since_prev_issue
FROM github.issues.issues
WHERE owner = '{{owner}}'
AND repo = '{{repo}}'
AND state = '{{state}}'
ORDER BY created_at;
```

## Variation: cumulative count split by state

Partitioning the running count by state shows open and closed backlogs
growing side by side:

```sql
SELECT
number,
state,
created_at,
COUNT(*) OVER (ORDER BY created_at) as cumulative_issues,
COUNT(*) OVER (PARTITION BY state ORDER BY created_at) as cumulative_by_state
FROM github.issues.issues
WHERE owner = '{{owner}}'
AND repo = '{{repo}}'
AND state = 'all'
ORDER BY created_at;
```

## Notes

The state parameter is load-bearing: the GitHub API defaults to open issues
only, so omitting it silently reports the open backlog as though it were
total intake and makes a growth curve meaningless for any repository that
closes issues. It is a server-side filter, so it belongs in the WHERE clause
rather than being applied to the result. Pull requests are returned by this
endpoint as issues carrying a pull_request object - filter them out when
counting genuine issue intake. days_since_prev_issue is null on the earliest
issue, and 0 marks issues created within the same day, which in bulk usually
indicates an import or mass triage rather than real reporting volume.
Predicate pushdown is not wired for this provider, so filters other than the
API's own parameters are applied client-side after every page is fetched.
