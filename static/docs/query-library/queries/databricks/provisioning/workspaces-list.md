---
title: Databricks workspaces in an account
description: Lists Databricks workspaces via the provider's vw_workspaces view with status, cloud placement and pricing tier; the account-level inventory entry point.
verb: select
status: stable
providers: [databricks_account]
services: [provisioning]
tags: [databricks, workspaces, inventory, views]
keywords: [workspace list, databricks account, workspace inventory, provisioning status]
intent_keywords:
  - list databricks workspaces
  - what workspaces exist in my databricks account
  - databricks workspace inventory
auth: [DATABRICKS_CLIENT_ID, DATABRICKS_CLIENT_SECRET]
params:
  - name: account_id
    type: string
    required: true
    pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    description: Databricks account id (GUID)
    example: 00000000-0000-0000-0000-000000000000
outputs:
  - name: workspace_id
    type: integer
    description: Numeric workspace id, the key for per-workspace queries
  - name: workspace_name
    type: string
    description: Workspace display name
  - name: workspace_status
    type: string
    description: RUNNING, PROVISIONING, FAILED or CANCELLING
  - name: cloud
    type: string
    description: Cloud provider hosting the workspace
  - name: aws_region
    type: string
    description: Region for AWS-hosted workspaces
  - name: location
    type: string
    description: Region for Azure or GCP-hosted workspaces
  - name: pricing_tier
    type: string
    description: STANDARD, PREMIUM or ENTERPRISE
cost:
  fan_out: account
  expensive: false
related:
  - databricks/provisioning/account-infrastructure
  - databricks/iam/workspace-assignments
last_verified: "2026-07-31"
---

Lists every workspace in a Databricks account using the provider's built-in
vw_workspaces view. Prefer the vw_ views over querying the underlying
resources directly: they are shipped inside the provider with per-dialect
implementations, so the same query works on the embedded SQLite backend and
on a PostgreSQL-backed instance without rewriting any JSON extraction.

## Query

```sql
SELECT
workspace_id,
workspace_name,
workspace_status,
cloud,
aws_region,
location,
pricing_tier
FROM databricks_account.provisioning.vw_workspaces
WHERE account_id = '{{account_id}}';
```

## Creating a workspace

A workspace needs a credential and a storage configuration to exist first -
see databricks/provisioning/account-infrastructure for both:

```sql
INSERT INTO databricks_account.provisioning.workspaces (
  aws_region,
  credentials_id,
  pricing_tier,
  storage_configuration_id,
  workspace_name,
  account_id
)
SELECT
  'us-east-1',
  '{{credentials_id}}',
  'PREMIUM',
  '{{storage_configuration_id}}',
  'my-workspace',
  '{{account_id}}';
```

## Notes

The region column that carries a value depends on the cloud: aws_region is
populated for AWS-hosted workspaces while location carries it for Azure and
GCP, and cloud itself is often null on AWS accounts, so treat the presence of
aws_region as the AWS signal rather than testing cloud. workspace_id is a
numeric id, not a GUID, and it is the key for every per-workspace query -
including the account-level assignment views. Creation is asynchronous:
workspace_status moves through PROVISIONING to RUNNING, so poll this view
rather than assuming the insert completed the workspace. Per-workspace
resources such as clusters, jobs and catalogs live in the separate
databricks_workspace provider, which authenticates against the workspace host
rather than the account, so an account-level credential alone will not reach
them.
