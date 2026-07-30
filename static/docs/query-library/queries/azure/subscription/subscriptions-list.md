---
title: Azure subscription detail
description: Reads a subscription's name and state; requires owner-level rights, so most service principals cannot call it.
verb: select
status: draft
providers: [azure]
services: [subscription]
tags: [azure, subscriptions, inventory]
keywords: [subscription list, tenant subscriptions, subscription state]
intent_keywords:
  - list azure subscriptions
  - enumerate subscriptions
  - what subscriptions can i see
auth: [AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET]
permissions: [Microsoft.Resources/subscriptions/read]
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
    description: Subscription display name
  - name: state
    type: string
    description: Enabled, Disabled, Deleted, PastDue or Warned
cost:
  fan_out: none
  expensive: false
related:
  - azure/resource/resource-groups-lifecycle
---

Reads a subscription's name and state. Unlike most Azure resources this one
is not readable by an ordinary service principal: the API restricts it to
subscription owners and returns UserNotAuthorized otherwise, so treat a
failure here as an authorization outcome rather than a broken query.

## Query

```sql
SELECT name, state
FROM azure.subscription.subscriptions
WHERE subscription_id = '{{subscription_id}}';
```

## Notes

subscription_id is required - this reads one subscription rather than
enumerating them, so it cannot be used to discover which subscriptions a
credential can reach. A service principal without the Owner role gets HTTP
401 with code UserNotAuthorized and the message that only subscription
owners can perform the operation; that is the expected result for the
least-privilege credentials most automation uses, not a defect. When the
goal is simply to confirm a credential works against a subscription, list
resource groups instead - see azure/resource/resource-groups-lifecycle -
which needs only Reader. This entry is draft because the owner-only path has
not been exercised successfully; the authorization failure is the only
behaviour that has been observed.
