---
title: GCP projects under an org or folder
description: Lists projects directly under a parent organization or folder with state, display name and labels; the fan-out dimension for any org-wide GCP audit.
verb: select
status: stable
providers: [google]
services: [cloudresourcemanager]
tags: [google, gcp, projects, inventory]
keywords: [project list, org descent, gcp projects, project state]
intent_keywords:
  - list gcp projects
  - projects in my organization
  - enumerate google projects
auth: [GOOGLE_CREDENTIALS]
permissions: [resourcemanager.projects.list]
params:
  - name: parent
    type: string
    required: true
    pattern: "^(organizations|folders)/[0-9]+$"
    description: "Parent container: organizations/<org_id> or folders/<folder_id>"
    example: organizations/141318256085
outputs:
  - name: projectId
    type: string
    description: Project identifier used by every other GCP query
  - name: displayName
    type: string
    description: Human-readable project name
  - name: state
    type: string
    description: ACTIVE or DELETE_REQUESTED
  - name: parent
    type: string
    description: Parent organization or folder
  - name: createTime
    type: string
    description: Creation timestamp
  - name: labels
    type: object
    description: Project labels
cost:
  fan_out: none
  expensive: false
related:
  - google/storage/buckets-by-project
  - google/iam/service-accounts-by-project
  - google/compute/instances-by-zone
last_verified: "2026-07-31"
---

Lists the GCP projects directly under one parent container - an organization
or a folder. Project enumeration is the entry point for any org-wide GCP
audit: the projectId values returned here are the fan-out dimension for every
per-project query.

## Query

```sql
SELECT projectId, displayName, state, parent, createTime, labels
FROM google.cloudresourcemanager.projects
WHERE parent = '{{parent}}';
```

## Variation: one project by id

Supplying projectsId reads a single project. Its name field carries the
resource path projects/<projectNumber>, which is the numeric identifier some
APIs require in place of the project id:

```sql
SELECT projectId, displayName, state, parent, name, labels
FROM google.cloudresourcemanager.projects
WHERE projectsId = 'my-project';
```

## Notes

This is the v3 Resource Manager API, where the state column is called state
and carries ACTIVE or DELETE_REQUESTED - the v1 name lifecycleState no longer
exists and selecting it fails with a no such column error. parent is
mandatory for the listing form: omitting it fails with HTTP 400 and 'field
[parent] has issue [invalid parent name]' rather than listing everything the
credential can see. The listing is not recursive - it returns only the
projects immediately under the container, so descend a hierarchy by recursing
through google.cloudresourcemanager.folders with the same parent form. Filter
to state = 'ACTIVE' before fanning out, since DELETE_REQUESTED projects still
appear but reject most API calls.
