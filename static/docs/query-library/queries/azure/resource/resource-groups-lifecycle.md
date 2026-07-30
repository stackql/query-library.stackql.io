---
title: Azure resource group lifecycle
description: Lists resource groups in a subscription, and creates or deletes one; the container every other Azure resource lives in.
verb: select
status: stable
providers: [azure]
services: [resource]
tags: [azure, resource, inventory, lifecycle]
keywords: [resource group, rg list, create resource group, delete resource group]
intent_keywords:
  - list azure resource groups
  - create a resource group
  - delete a resource group
auth: [AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET]
permissions: [Microsoft.Resources/subscriptions/resourceGroups/read]
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
    description: Resource group name
  - name: location
    type: string
    description: Region the group is homed in
  - name: provisioning_state
    type: string
    description: Succeeded, Deleting or Failed
  - name: id
    type: string
    description: Fully qualified resource id
  - name: tags
    type: object
    description: Resource group tags
cost:
  fan_out: subscription
  expensive: false
  notes: One list call per subscription when swept tenant-wide
related:
  - azure/network/vnet-subnet-provision
  - azure/storage/storage-account-provision
  - azure/compute/vms-by-subscription
last_verified: "2026-07-30"
---

Lists the resource groups in a subscription. The resource group is the
container every other Azure resource belongs to and the unit of bulk
deletion, so this is the entry point for both inventory and teardown.

## Query

```sql
SELECT name, location, provisioning_state, id, tags
FROM azure.resource.resource_groups
WHERE subscription_id = '{{subscription_id}}';
```

## Creating a resource group

Body properties are supplied as plain columns - location here - with no
prefix on the column name:

```sql
INSERT INTO azure.resource.resource_groups(
  resource_group_name,
  subscription_id,
  location
)
SELECT 'my-resource-group', '{{subscription_id}}', 'eastus';
```

## Deleting a resource group

Deletion is asynchronous and cascades to every resource inside the group:

```sql
DELETE FROM azure.resource.resource_groups
WHERE resource_group_name = 'my-resource-group'
AND subscription_id = '{{subscription_id}}';
```

## Notes

subscription_id is a required routing parameter on effectively every Azure
resource, and resource_group_name narrows a list to a single group. Body
properties are passed as plain columns: this provider applies a naive
request-body transform, so location and properties are written directly with
no data__ prefix - the data__location and data__properties form used by older
Azure examples fails with InvalidResource. Deleting a group is asynchronous
and returns immediately; the group reports provisioning_state Deleting for
some minutes while its contents are removed, so poll the list query rather
than assuming completion. A resource group's location is only metadata for
the group itself - resources inside it may live in other regions, which is
useful when one region has no capacity for a given SKU.
