---
title: Databricks account credentials and storage configurations
description: Lists the cross-account credentials and root storage configurations registered in a Databricks account; the prerequisites a workspace is built from.
verb: select
status: stable
providers: [databricks_account]
services: [provisioning]
tags: [databricks, provisioning, inventory, iam, views]
keywords: [cross account role, credentials id, storage configuration, root bucket, workspace prerequisites]
intent_keywords:
  - list databricks credentials
  - what storage configurations exist
  - databricks cross account roles
auth: [DATABRICKS_CLIENT_ID, DATABRICKS_CLIENT_SECRET]
params:
  - name: account_id
    type: string
    required: true
    pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    description: Databricks account id (GUID)
    example: 00000000-0000-0000-0000-000000000000
outputs:
  - name: credentials_id
    type: string
    description: Credential id, referenced when creating a workspace
  - name: credentials_name
    type: string
    description: Credential display name
  - name: aws_role_arn
    type: string
    description: Cross-account IAM role Databricks assumes into the customer account
  - name: creation_time
    type: integer
    description: Creation timestamp in epoch milliseconds
cost:
  fan_out: account
  expensive: false
related:
  - databricks/provisioning/workspaces-list
  - databricks/iam/workspace-assignments
last_verified: "2026-07-31"
---

Lists the cross-account credentials registered in a Databricks account, and
alongside them the root storage configurations. Both are prerequisites for
creating a workspace, and together they describe the trust and data boundary
between Databricks and the cloud account it runs in - each credential names
an IAM role Databricks is allowed to assume.

## Query

```sql
SELECT
credentials_id,
credentials_name,
aws_role_arn,
creation_time
FROM databricks_account.provisioning.vw_credentials
WHERE account_id = '{{account_id}}';
```

## Storage configurations

```sql
SELECT
storage_configuration_id,
storage_configuration_name,
root_bucket_name,
role_arn,
creation_time
FROM databricks_account.provisioning.vw_storage_configurations
WHERE account_id = '{{account_id}}';
```

## Networks and VPC endpoints

The same pattern covers the rest of the provisioning surface - customer
managed VPCs and PrivateLink endpoints:

```sql
SELECT * FROM databricks_account.provisioning.vw_networks
WHERE account_id = '{{account_id}}';
```

```sql
SELECT * FROM databricks_account.provisioning.vw_vpc_endpoints
WHERE account_id = '{{account_id}}';
```

## Notes

Use the provider's vw_ views rather than the underlying resources: they ship
inside the provider with separate SQLite and PostgreSQL implementations, so
the same statement runs unchanged on either backend, where hand-rolled JSON
extraction would be dialect-specific. Each aws_role_arn here is a standing
trust relationship - a role in the cloud account that Databricks can assume -
so this list is the one to review when auditing what Databricks can reach;
cross-reference it with the role's trust policy on the cloud side. Credentials
and storage configurations are account-scoped and reusable across workspaces,
which is why deleting one that a workspace still references fails.
creation_time is epoch milliseconds, not a timestamp string. Sibling views in
the same service cover networks, VPC endpoints, encryption keys and the
network error and warning detail attached to a failed network configuration.
Some of those are gated by pricing tier rather than permissions:
vw_vpc_endpoints returns HTTP 403 PERMISSION_DENIED with the message that the
account does not have one of the required pricing tier(s) ENTERPRISE, so on a
PREMIUM account treat that as a plan limitation rather than a credential
problem. vw_networks returning empty simply means no customer-managed VPC is
registered, which is the norm for Databricks-managed networking.
