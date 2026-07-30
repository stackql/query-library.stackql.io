---
title: Azure storage account and blob container provisioning
description: Lists storage accounts in a subscription, and creates an account with a private blob container; the object storage substrate.
verb: select
status: stable
providers: [azure]
services: [storage]
tags: [azure, storage, blob, lifecycle, inventory]
keywords: [storage account, blob container, create storage, object storage]
intent_keywords:
  - list azure storage accounts
  - create a storage account
  - create a blob container
auth: [AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET]
permissions: [Microsoft.Storage/storageAccounts/read]
params:
  - name: subscription_id
    type: string
    required: true
    pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    description: Azure subscription id (GUID)
    example: 00000000-0000-0000-0000-000000000000
outputs:
  - name: name
    type: string
    description: Storage account name, globally unique
  - name: location
    type: string
    description: Region
  - name: kind
    type: string
    description: StorageV2, BlobStorage or FileStorage
  - name: provisioning_state
    type: string
    description: Succeeded, ResolvingDns or Creating
cost:
  fan_out: subscription
  expensive: false
  notes: One list call per subscription when swept tenant-wide
related:
  - azure/resource/resource-groups-lifecycle
last_verified: "2026-07-30"
---

Lists the storage accounts in a subscription and covers creating one with a
private blob container. Account names are globally unique across Azure and
restricted to 3-24 lowercase alphanumeric characters, which is the most
common cause of a create failing.

## Query

```sql
SELECT name, location, kind, provisioning_state
FROM azure.storage.storage_accounts
WHERE subscription_id = '{{subscription_id}}';
```

## Creating a storage account

sku and properties are JSON documents passed as plain columns. The security
posture is set at creation here: no public blob access, TLS 1.2 floor and
HTTPS only:

```sql
INSERT INTO azure.storage.storage_accounts(
  account_name,
  resource_group_name,
  subscription_id,
  location,
  sku,
  kind,
  properties
)
SELECT
  'mystorageacct001',
  'my-resource-group',
  '{{subscription_id}}',
  'eastus',
  '{"name": "Standard_LRS"}',
  'StorageV2',
  '{"accessTier": "Hot", "allowBlobPublicAccess": false, "minimumTlsVersion": "TLS1_2", "supportsHttpsTrafficOnly": true}';
```

## Creating a blob container

```sql
INSERT INTO azure.storage.blob_containers(
  account_name,
  container_name,
  resource_group_name,
  subscription_id,
  properties
)
SELECT
  'mystorageacct001',
  'my-container',
  'my-resource-group',
  '{{subscription_id}}',
  '{"publicAccess": "None"}';
```

## Listing blob containers

```sql
SELECT name, public_access, has_immutability_policy
FROM azure.storage.blob_containers
WHERE subscription_id = '{{subscription_id}}'
AND resource_group_name = 'my-resource-group'
AND account_name = 'mystorageacct001';
```

## Notes

Body properties are plain columns with no data__ prefix. A storage account
passes through provisioning_state ResolvingDns before Succeeded because the
account name becomes a public DNS label, so poll rather than assuming the
account is usable immediately after the insert returns. publicAccess None on
the container plus allowBlobPublicAccess false on the account are the two
independent controls that keep blobs private - the account-level setting wins,
so a container requesting public access on a locked-down account still
resolves to private. Listing containers requires the account_name as well as
the resource group. Blob content operations sit on the separate data plane
service azure.storage_blob, which authenticates independently of the control
plane.
