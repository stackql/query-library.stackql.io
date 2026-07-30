---
title: Azure public IP address provisioning
description: Lists public IP addresses in a resource group, and creates or deletes a static Standard SKU address for attaching to a NIC or load balancer.
verb: select
status: stable
providers: [azure]
services: [network]
tags: [azure, network, public-ip, lifecycle, inventory]
keywords: [public ip, static ip, ip allocation, standard sku, exposed address]
intent_keywords:
  - list azure public ip addresses
  - create a static public ip
  - which public ips are allocated
auth: [AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET]
permissions: [Microsoft.Network/publicIPAddresses/read]
params:
  - name: subscription_id
    type: string
    required: true
    pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    description: Azure subscription id (GUID)
    example: 00000000-0000-0000-0000-000000000000
  - name: resource_group_name
    type: string
    required: true
    description: Resource group containing the addresses
    example: my-resource-group
outputs:
  - name: name
    type: string
    description: Public IP resource name
  - name: location
    type: string
    description: Region
  - name: ip_address
    type: string
    description: Allocated address; null until provisioning succeeds, and always null for Dynamic addresses that are not attached
  - name: public_ip_allocation_method
    type: string
    description: Static or Dynamic
  - name: provisioning_state
    type: string
    description: Succeeded, Updating or Failed
  - name: sku
    type: object
    description: SKU object holding name (Basic or Standard) and tier
cost:
  fan_out: subscription
  expensive: false
  notes: A reserved public IP is billed whether or not it is attached
related:
  - azure/network/vnet-subnet-provision
  - azure/resource/resource-groups-lifecycle
last_verified: "2026-07-30"
---

Lists the public IP addresses allocated in a resource group with their
address, allocation method and SKU, and covers creating and deleting one.
Public IPs are the account's internet-facing surface, so this doubles as an
exposure inventory: every address here is a potential ingress point.

## Query

```sql
SELECT
name,
location,
ip_address,
public_ip_allocation_method,
provisioning_state,
sku
FROM azure.network.public_ip_addresses
WHERE subscription_id = '{{subscription_id}}'
AND resource_group_name = '{{resource_group_name}}';
```

## Creating a static public IP

sku and properties are JSON documents passed as plain columns:

```sql
INSERT INTO azure.network.public_ip_addresses(
  public_ip_address_name,
  resource_group_name,
  subscription_id,
  location,
  sku,
  properties,
  tags
)
SELECT
  'my-public-ip',
  '{{resource_group_name}}',
  '{{subscription_id}}',
  'eastus',
  '{"name": "Standard", "tier": "Regional"}',
  '{"publicIPAllocationMethod": "Static"}',
  '{"provisioner": "stackql"}';
```

## Deleting a public IP

```sql
DELETE FROM azure.network.public_ip_addresses
WHERE subscription_id = '{{subscription_id}}'
AND resource_group_name = '{{resource_group_name}}'
AND public_ip_address_name = 'my-public-ip';
```

## Notes

Standard SKU addresses must be Static - the API rejects a Standard address
requesting Dynamic allocation - while Basic SKU permits either. Basic SKU is
retiring, so new work should use Standard. ip_address is populated as soon as
provisioning_state reaches Succeeded for a Static address, but stays null for
a Dynamic one until it is attached to a running resource, so a null there is
not necessarily a failure. Deleting an address that is still attached to a
network interface fails; detach or delete the NIC first, or delete the whole
resource group to cascade. A reserved address bills whether attached or not,
so unattached addresses in this list are usually waste worth reclaiming.
Body properties are plain columns with no data__ prefix.
