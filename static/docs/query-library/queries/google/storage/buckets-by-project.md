---
title: GCS buckets in a project
description: Lists Cloud Storage buckets in one project with location, storage class and creation time; the per-project storage inventory.
verb: select
status: stable
providers: [google]
services: [storage]
tags: [google, gcp, storage, inventory]
keywords: [gcs inventory, bucket list, cloud storage buckets, storage class]
intent_keywords:
  - list gcs buckets
  - what buckets exist in my project
  - cloud storage bucket inventory
auth: [GOOGLE_CREDENTIALS]
permissions: [storage.buckets.list]
params:
  - name: project
    type: identifier
    required: true
    description: GCP project id
    example: stackql-demo
outputs:
  - name: name
    type: string
    description: Bucket name, globally unique across GCS
  - name: location
    type: string
    description: Bucket location, a region or multi-region such as US
  - name: storageClass
    type: string
    description: STANDARD, NEARLINE, COLDLINE or ARCHIVE
  - name: timeCreated
    type: string
    description: Creation timestamp
cost:
  fan_out: project
  expensive: false
  notes: One list call per project when swept org-wide
related:
  - google/cloudresourcemanager/projects-by-parent
  - google/iam/service-accounts-by-project
last_verified: "2026-07-31"
---

Lists every Cloud Storage bucket in a single project. Bucket listing is
per-project, so an org-wide storage inventory iterates the projects from
google/cloudresourcemanager/projects-by-parent and runs this query for each.

## Query

```sql
SELECT name, location, storageClass, timeCreated
FROM google.storage.buckets
WHERE project = '{{project}}';
```

## Variation: public access and access control posture

iamConfiguration carries the two settings that decide whether a bucket can be
made public - uniform bucket-level access, and the public access prevention
mode:

```sql
SELECT
name,
location,
JSON_EXTRACT(iamConfiguration, '$.uniformBucketLevelAccess.enabled') AS uniform_access,
JSON_EXTRACT(iamConfiguration, '$.publicAccessPrevention') AS public_access_prevention
FROM google.storage.buckets
WHERE project = '{{project}}';
```

## Notes

The parameter is project here, spelled as the project id rather than the
projectsId form the IAM API uses - the naming is not consistent across Google
services, so check the required params per resource rather than assuming.
Bucket names are globally unique across all of GCS, not just the project,
which is why a create can fail on a name already taken by another
organisation. location is a region such as us-central1 or a multi-region such
as US or EU; multi-region buckets replicate across a continent and cost more
per GB. Buckets carry no project column in the response, so the project
scoping comes entirely from the request parameter - when sweeping several
projects, carry the project id through from the loop rather than expecting it
in the result.
