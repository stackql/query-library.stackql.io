---
title: GitHub repository stargazers
description: Lists the accounts that have starred a GitHub repository with login, profile URL and account type; the audience snapshot to take before a repository changes visibility or ownership.
verb: select
status: stable
providers: [github]
services: [activity]
tags: [github, activity, community, stars]
keywords: [stargazers, stars, who starred, star list, starred by, repository audience]
intent_keywords:
  - who starred this github repo
  - list stargazers for a repository
  - which users have starred my repo
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
    description: Stargazer login
  - name: html_url
    type: string
    description: Profile URL of the stargazer
  - name: type
    type: string
    description: Account type, User or Organization
cost:
  fan_out: none
  expensive: false
  notes: Paginated transparently
related:
  - github/repos/org-repos-list
  - github/repos/contributor-analytics
author: Jeffrey Aven
author_company: StackQL Studios
last_verified: "2026-10-05"
---

Lists every account that has starred a repository, one row per stargazer.
Use it to capture a repository's audience before it changes visibility, moves
to another owner or is archived: GitHub clears stars when a public repository
is made private, and the `stargazers_count` on the repository record only
says how many, not who.

## Query

```sql
SELECT
login,
html_url,
type
FROM github.activity.repo_stargazers
WHERE owner = '{{owner}}'
AND repo = '{{repo}}';
```

## Notes

The resource also exposes a starred_at column, but the provider requests the
plain JSON media type rather than GitHub's star media type, so starred_at is
always null. For the star count alone read stargazers_count from
github.repos.repos instead of counting rows here. A 403 with the message
"Resource not accessible by personal access token" comes from a fine-grained
personal access token that does not cover the repository; use a classic token
or extend the fine-grained token's repository access and Metadata permission.
