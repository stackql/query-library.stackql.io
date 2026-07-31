---
title: GCE instances in a project
description: Lists Compute Engine instances across every zone in a project in one call, with status, machine type and placement.
verb: select
status: stable
providers: [google]
services: [compute]
tags: [google, gcp, compute, inventory]
keywords: [gce inventory, vm list, compute instances, aggregated list]
intent_keywords:
  - list gce instances
  - what vms are running in gcp
  - compute engine instance inventory
auth: [GOOGLE_CREDENTIALS]
permissions: [compute.instances.list]
params:
  - name: project
    type: identifier
    required: true
    description: GCP project id
    example: stackql-demo
outputs:
  - name: name
    type: string
    description: Instance name
  - name: status
    type: string
    description: RUNNING, TERMINATED, SUSPENDED or STOPPING
  - name: machineType
    type: string
    description: Machine type URL; the type name is the last path segment
  - name: zone
    type: string
    description: Zone URL the instance runs in
  - name: creationTimestamp
    type: string
    description: Creation timestamp
cost:
  fan_out: project
  expensive: false
  notes: One aggregated call per project when swept org-wide
related:
  - google/cloudresourcemanager/projects-by-parent
  - google/iam/service-accounts-by-project
last_verified: "2026-07-31"
---

Lists Compute Engine instances across every zone in a project. Supplying only
the project routes to the aggregated list, which covers all zones in a single
request - far cheaper than iterating zones, and it avoids missing instances in
zones you did not think to check.

## Query

```sql
SELECT name, status, machineType, zone, creationTimestamp
FROM google.compute.instances
WHERE project = '{{project}}';
```

## Variation: a single zone

Adding zone routes to the per-zone list instead:

```sql
SELECT name, status, machineType, zone, creationTimestamp
FROM google.compute.instances
WHERE project = '{{project}}'
AND zone = 'us-central1-a';
```

## Notes

Project alone routes to aggregated_list and zone narrows it to the per-zone
list - two different operations on one resource, so the aggregated form is
the one to reach for unless a specific zone is genuinely the question. The
per-zone form has a reporting quirk worth knowing: a zone with no instances
returns a single row whose columns are all null except the zone that was
requested, rather than zero rows, so test a data column such as name for null
rather than counting rows. machineType and zone come back as full resource
URLs - take the last path segment for the short name. TERMINATED in GCE means
stopped rather than deleted, and stopped instances still appear here and
still bill for attached disks, so filter on status when counting live
capacity.
