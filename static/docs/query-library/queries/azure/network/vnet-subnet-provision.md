---
title: Azure virtual network and subnet provisioning
description: Creates a virtual network and subnet, and lists them with their address ranges; the network substrate VMs and private endpoints attach to.
verb: select
status: stable
providers: [azure]
services: [network]
tags: [azure, network, vnet, subnet, lifecycle]
keywords: [virtual network, vnet, subnet, address prefix, cidr]
intent_keywords:
  - list azure virtual networks
  - create a vnet and subnet
  - what subnets exist in my vnet
auth: [AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET]
permissions: [Microsoft.Network/virtualNetworks/read]
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
    description: Resource group containing the virtual network
    example: my-resource-group
outputs:
  - name: name
    type: string
    description: Virtual network name
  - name: location
    type: string
    description: Region
  - name: provisioning_state
    type: string
    description: Succeeded, Updating or Failed
  - name: address_space
    type: object
    description: Address space object holding the addressPrefixes array
cost:
  fan_out: subscription
  expensive: false
related:
  - azure/resource/resource-groups-lifecycle
  - azure/compute/vms-by-subscription
last_verified: "2026-07-30"
---

Lists the virtual networks in a resource group with their address space, and
covers creating a vnet and a subnet inside it. The subnet is what a network
interface - and therefore a VM - attaches to, so this is the prerequisite for
any compute provisioning.

## Query

```sql
SELECT name, location, provisioning_state, address_space
FROM azure.network.virtual_networks
WHERE subscription_id = '{{subscription_id}}'
AND resource_group_name = '{{resource_group_name}}';
```

## Creating a virtual network

```sql
INSERT INTO azure.network.virtual_networks(
  virtual_network_name,
  resource_group_name,
  subscription_id,
  location,
  properties
)
SELECT
  'my-vnet',
  '{{resource_group_name}}',
  '{{subscription_id}}',
  'eastus',
  '{"addressSpace": {"addressPrefixes": ["10.10.0.0/16"]}}';
```

## Creating a subnet

The subnet is a child resource, so it takes the parent virtual_network_name
as well as its own name, and carries no location of its own:

```sql
INSERT INTO azure.network.subnets(
  subnet_name,
  virtual_network_name,
  resource_group_name,
  subscription_id,
  properties
)
SELECT
  'my-subnet',
  'my-vnet',
  '{{resource_group_name}}',
  '{{subscription_id}}',
  '{"addressPrefix": "10.10.1.0/24"}';
```

## Listing subnets

```sql
SELECT name, provisioning_state, address_prefix
FROM azure.network.subnets
WHERE subscription_id = '{{subscription_id}}'
AND resource_group_name = '{{resource_group_name}}'
AND virtual_network_name = 'my-vnet';
```

## Notes

Body properties are plain columns - location and properties - with no data__
prefix; the older data__location form fails with InvalidResource against this
provider. The subnet exposes address_prefix as a flattened top-level column
on read while taking addressPrefix nested inside properties on write, so the
read and write shapes differ. A vnet reports provisioning_state Updating for
a short window after a subnet is added, which is normal rather than a
failure. Subnets cannot be deleted while anything is attached: removing one
that still has a network interface fails with InUseSubnetCannotBeDeleted, so
delete dependants first, or delete the whole resource group to cascade.
Network interfaces live at azure.network.network_interfaces - note the
resource is network_interfaces, not interfaces.
