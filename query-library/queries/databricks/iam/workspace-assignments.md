---
title: Databricks workspace access assignments
description: Lists the principals assigned to a Databricks workspace with their permission level, resolving users, groups and service principals into one view.
verb: select
status: stable
providers: [databricks_account]
services: [iam]
tags: [databricks, iam, security, identity, access, views]
keywords: [workspace assignment, who has access, admin permission, service principal, entitlements]
intent_keywords:
  - who has access to my databricks workspace
  - list workspace admins
  - databricks workspace permissions
auth: [DATABRICKS_CLIENT_ID, DATABRICKS_CLIENT_SECRET]
params:
  - name: account_id
    type: string
    required: true
    pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    description: Databricks account id (GUID)
    example: 00000000-0000-0000-0000-000000000000
  - name: workspace_id
    type: string
    required: true
    description: Numeric workspace id from the workspace inventory
    example: "7474653260057820"
outputs:
  - name: principal_id
    type: string
    description: Numeric id of the assigned principal
  - name: display_name
    type: string
    description: Human-readable principal name
  - name: user_name
    type: string
    description: Email when the principal is a user, otherwise null
  - name: group_name
    type: string
    description: Group name when the principal is a group, otherwise null
  - name: service_principal_name
    type: string
    description: Application id when the principal is a service principal, otherwise null
  - name: permission
    type: string
    description: ADMIN or USER
cost:
  fan_out: account
  expensive: false
  notes: One call per workspace when swept across an account
related:
  - databricks/provisioning/workspaces-list
  - databricks/provisioning/account-infrastructure
last_verified: "2026-07-31"
---

Lists every principal assigned to a Databricks workspace with its permission
level. The view resolves all three principal types into one result - users,
groups and service principals - so a single query answers "who can reach this
workspace and at what level", which is the core access review question.

## Query

```sql
SELECT
principal_id,
display_name,
user_name,
group_name,
service_principal_name,
permission
FROM databricks_account.iam.vw_workspace_assignments
WHERE account_id = '{{account_id}}'
AND workspace_id = '{{workspace_id}}';
```

## Related identity views

The account IAM service exposes the same shape for group membership and role
assignment across the account rather than one workspace:

```sql
SELECT * FROM databricks_account.iam.vw_account_group_members
WHERE account_id = '{{account_id}}';
```

```sql
SELECT * FROM databricks_account.iam.vw_account_service_principal_roles
WHERE account_id = '{{account_id}}';
```

## Notes

workspace_id is required: without it the call fails with HTTP 404 and
RESOURCE_DOES_NOT_EXIST 'Workspace not found' rather than listing every
workspace, so enumerate workspaces first with
databricks/provisioning/workspaces-list and iterate. Exactly one of
user_name, group_name and service_principal_name is populated per row and the
other two are null, which is how the principal type is determined - a row
carrying service_principal_name is an application identity rather than a
human, and those are the ones worth checking for ADMIN. permission is ADMIN
or USER at the workspace level; finer-grained object permissions live in the
databricks_workspace provider and need workspace-scoped credentials. Prefer
these vw_ views to the raw resources: they are embedded in the provider with
per-dialect implementations, so they behave identically on the SQLite and
PostgreSQL backends.
