---
title: Cloudflare zones
description: Lists all Cloudflare zones visible to the API token with status and pause state; the zone id keys every per-zone API.
verb: select
status: stable
providers: [cloudflare]
services: [zones]
tags: [cloudflare, dns, zones, inventory]
keywords: [zone list, domains on cloudflare, dns zones, zone id]
intent_keywords:
  - list cloudflare zones
  - what domains are on cloudflare
  - cloudflare zone inventory
auth: [CLOUDFLARE_API_TOKEN]
params: []
outputs:
  - name: id
    type: string
    description: Zone identifier, needed by every per-zone API
  - name: name
    type: string
    description: Zone apex domain name
  - name: status
    type: string
    description: active, pending, initializing or moved
  - name: paused
    type: boolean
    description: True when Cloudflare is bypassed for the zone
cost:
  fan_out: account
  expensive: false
related:
  - cloudflare/zones/http-analytics
  - cloudflare/kv/kv-lifecycle
last_verified: "2026-07-30"
---

Lists every Cloudflare zone the API token can see, across all accounts the
token is scoped to. The zone id returned here is the key for every per-zone
follow-up: analytics, DNS records, rulesets and settings all take it.

## Query

```sql
SELECT id, name, status, paused
FROM cloudflare.zones.zones;
```

## Notes

No parameters: scoping comes entirely from the token, so a token restricted
to one zone returns one row and an account-wide token returns them all. A
zone with status active but paused = true is resolving through Cloudflare DNS
only, with proxying and all edge features bypassed - a common cause of
"security settings are configured but not taking effect". Statuses other than
active mean the zone is not yet serving: pending is awaiting nameserver
delegation and initializing is provisioning. Cloudflare API tokens are scoped
per permission group, so a token that lists zones successfully may still fail
with an authentication error on DNS records or analytics; grant each surface
explicitly rather than assuming zone access implies the rest.
