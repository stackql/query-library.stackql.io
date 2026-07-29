---
title: IAM access key age and rotation status
description: Lists a user's access keys with their age in days; keys older than the rotation window are the finding.
verb: select
status: stable
providers: [aws]
services: [iam]
tags: [aws, iam, security, cspm, credentials, identity]
keywords: [access key age, key rotation, stale credentials, never rotated]
intent_keywords:
  - find access keys older than 90 days
  - which access keys need rotating
  - stale iam access keys
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["iam:ListAccessKeys"]
params:
  - name: user_name
    type: string
    required: true
    description: IAM user whose keys to list; iterate the account's users for a full sweep
    example: jeffrey.aven
outputs:
  - name: user_name
    type: string
    description: IAM user the key belongs to
  - name: access_key_id
    type: string
    description: Access key identifier
  - name: status
    type: string
    description: Active or Inactive
  - name: create_date
    type: string
    description: Key creation date
  - name: key_age_days
    type: number
    description: Age of the key in whole days
cost:
  fan_out: account
  expensive: false
  notes: One call per IAM user when swept account-wide
related:
  - aws/iam/users-list
  - aws/iam/users-console-no-mfa
last_verified: "2026-07-29"
---

Lists the access keys belonging to one IAM user with each key's age in days.
Long-lived keys are the classic credential hygiene finding: compare
key_age_days against your rotation window (90 days is the common baseline)
and treat Active keys past it as needing rotation. For an account-wide sweep,
enumerate users with aws/iam/users-list and iterate this query over them.

## Query

```sql
SELECT
user_name,
access_key_id,
status,
create_date,
ROUND(julianday('now') - julianday(create_date)) as key_age_days
FROM aws.iam.access_keys
WHERE region = 'us-east-1'
AND UserName = '{{user_name}}';
```

## Notes

UserName is load-bearing: without it the API returns only the calling
identity's own keys, which silently looks like a complete answer. IAM is
global, so region = 'us-east-1' is endpoint routing. julianday date
arithmetic is the default embedded SQLite backend's dialect; on PostgreSQL
use EXTRACT(DAY FROM now() - create_date::timestamp). A key that has never
been rotated is simply the oldest one for the user - there is no separate
last-rotated field, since rotation means creating a new key and deleting the
old one. Inactive keys still count as credentials that exist and should be
deleted rather than left disabled.
