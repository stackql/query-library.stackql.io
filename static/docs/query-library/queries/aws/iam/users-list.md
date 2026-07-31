---
title: IAM users enumeration
description: Enumerates IAM users in the account; IAM is global and always served from us-east-1, so the query takes no parameters.
verb: select
status: stable
providers: [awscc]
services: [iam]
tags: [aws, iam, identity, security, inventory]
keywords: [user list, iam inventory, account users]
intent_keywords:
  - list iam users
  - what users exist in the account
  - iam user inventory
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["cloudformation:ListResources", "iam:ListUsers"]
params: []
outputs:
  - name: user_name
    type: string
    description: IAM user name
cost:
  fan_out: none
  expensive: false
last_verified: "2026-07-29"
author: Jeffrey Aven
author_company: StackQL Studios
---

Enumerates every IAM user in the account. IAM is a global service served from
a single endpoint: the region is always us-east-1 regardless of where
workloads run, so it is hardcoded in the query rather than taken as a
parameter. Use this as the starting point for credential and access audits.

## Query

```sql
SELECT user_name
FROM awscc.iam.users_list_only
WHERE region = 'us-east-1';
```

## Variation: full attributes via the native provider

The native provider returns the full user record in the same single call and
needs only iam:ListUsers - prefer it when attributes are wanted, not just
names:

```sql
SELECT user_name, user_id, arn, create_date, password_last_used, path
FROM aws.iam.users
WHERE region = 'us-east-1';
```

## Notes

IAM is global: region = 'us-east-1' is endpoint routing, never a filter, and
applies to every IAM query. The template is the cheap identifier-only path
via Cloud Control, requiring cloudformation:ListResources plus
iam:ListUsers; the native variation requires only iam:ListUsers and returns
ARN, user id, creation date, password_last_used and path in one call.
password_last_used is the string null for users who have never signed in
with a console password. Sibling list-only resources with the same shape
cover roles (awscc.iam.roles_list_only) and groups
(awscc.iam.groups_list_only).
