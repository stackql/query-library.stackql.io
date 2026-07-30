---
title: Azure VM custom script extension
description: Runs a shell command on an existing VM via the CustomScript extension, and lists the extensions installed on a VM; the way to load content onto a server after provisioning.
verb: select
status: draft
providers: [azure]
services: [compute]
tags: [azure, compute, vms, extension, bootstrap]
keywords: [custom script, vm extension, bootstrap vm, run command on vm, install software]
intent_keywords:
  - run a script on an azure vm
  - install software on a vm after creation
  - list vm extensions
auth: [AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET]
permissions: [Microsoft.Compute/virtualMachines/extensions/read]
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
    description: Resource group containing the VM
    example: my-resource-group
  - name: vm_name
    type: string
    required: true
    description: Virtual machine to read extensions from
    example: my-vm
outputs:
  - name: name
    type: string
    description: Extension name
  - name: publisher
    type: string
    description: Extension publisher, e.g. Microsoft.Azure.Extensions
  - name: type_handler_version
    type: string
    description: Handler version
  - name: provisioning_state
    type: string
    description: Succeeded, Creating or Failed
cost:
  fan_out: none
  expensive: false
  notes: One call per VM
related:
  - azure/compute/vms-by-subscription
  - azure/network/public-ip-provision
---

Lists the extensions installed on a virtual machine, and covers installing
the CustomScript extension to run a shell command on it. CustomScript is the
standard way to load content onto a server after provisioning - fetch a file,
install a package, start a service - without needing SSH access from the
caller.

## Query

```sql
SELECT
name,
publisher,
type_handler_version,
provisioning_state
FROM azure.compute.virtual_machine_extensions
WHERE subscription_id = '{{subscription_id}}'
AND resource_group_name = '{{resource_group_name}}'
AND vm_name = '{{vm_name}}';
```

## Installing the CustomScript extension

The command runs as root on the VM. Here it fetches a page and serves it on
port 8080:

```sql
INSERT INTO azure.compute.virtual_machine_extensions(
  resource_group_name,
  subscription_id,
  vm_extension_name,
  vm_name,
  location,
  properties
)
SELECT
  '{{resource_group_name}}',
  '{{subscription_id}}',
  'customScript',
  '{{vm_name}}',
  'eastus',
  '{"publisher": "Microsoft.Azure.Extensions", "type": "CustomScript", "typeHandlerVersion": "2.1", "settings": {"commandToExecute": "wget -O index.html https://example.com/index.html && nohup busybox httpd -f -p 8080 &"}}';
```

## Removing the extension

```sql
DELETE FROM azure.compute.virtual_machine_extensions
WHERE subscription_id = '{{subscription_id}}'
AND resource_group_name = '{{resource_group_name}}'
AND vm_extension_name = 'customScript'
AND vm_name = '{{vm_name}}';
```

## Notes

The extension is a child resource, so every statement carries both vm_name
and vm_extension_name, and the create additionally requires location - which
must match the VM's region. publisher, type and typeHandlerVersion go inside
the properties document, not as columns. The command runs as root and its
output is not returned by the API: check provisioning_state to see whether
the extension succeeded, then verify the effect out of band, for example by
requesting the port the script opened. Reaching that port also needs a
network security group rule allowing it and a public IP attached to the VM's
NIC - the extension itself opens no firewall. Use the settings key for
non-sensitive parameters and protectedSettings for anything secret, since
settings is readable back from the API. This entry is draft: the read and
delete shapes are confirmed against the provider but the install has not been
executed, because no VM could be provisioned on the test subscription.
