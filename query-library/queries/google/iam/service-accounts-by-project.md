---
title: GCP service accounts in a project
description: Lists IAM service accounts in one project with email, display name and unique id; the workload principal inventory for a privilege audit.
verb: select
status: stable
providers: [google]
services: [iam]
tags: [google, gcp, iam, identity, security, inventory]
keywords: [service account list, robot accounts, sa inventory, workload identity]
intent_keywords:
  - list gcp service accounts
  - what service accounts exist
  - service account inventory
auth: [GOOGLE_CREDENTIALS]
permissions: [iam.serviceAccounts.list]
params:
  - name: project
    type: identifier
    required: true
    description: GCP project id; supplied as projectsId on this API
    example: stackql-demo
outputs:
  - name: email
    type: string
    description: Service account email, the principal identifier used in IAM bindings
  - name: displayName
    type: string
    description: Human display name
  - name: uniqueId
    type: string
    description: Stable numeric id that survives delete and recreate of the same email
  - name: disabled
    type: boolean
    description: True when the account is disabled; null when the field is absent
cost:
  fan_out: project
  expensive: false
  notes: One list call per project when swept org-wide
related:
  - google/cloudresourcemanager/projects-by-parent
  - google/storage/buckets-by-project
last_verified: "2026-07-31"
---

Lists the IAM service accounts in a single project. Service accounts are the
workload principals in GCP, so this enumeration is the starting point for key
hygiene and privilege audits - every one of these emails can appear in IAM
bindings across the organisation.

## Query

```sql
SELECT email, displayName, uniqueId, disabled
FROM google.iam.service_accounts
WHERE projectsId = '{{project}}';
```

## Notes

The parameter is projectsId, not project - the IAM API uses the projectsId
form while Cloud Storage and Compute take project, so the naming differs
between Google services and a wrong choice fails with a could not locate
symbol error. disabled comes back null rather than false for accounts that
have never been disabled, so test for the string true rather than treating
null as enabled being unset. Every project carries Google-managed default
accounts - the App Engine and Compute Engine defaults appear in this list
alongside user-created ones - and those defaults are often over-privileged
with project Editor, which makes them worth flagging in an audit even though
nobody created them deliberately. uniqueId is stable across a delete and
recreate of the same email, so it is the safer join key when correlating with
audit logs. For key hygiene, follow up per account with
google.iam.service_accounts_keys filtered on the account email to find
user-managed keys and their ages.
