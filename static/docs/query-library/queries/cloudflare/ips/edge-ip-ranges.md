---
title: Cloudflare edge IP ranges
description: Returns Cloudflare's published IPv4 and IPv6 edge ranges as one CIDR per row; the source list for origin firewall allowlists.
verb: select
status: stable
providers: [cloudflare]
services: [ips]
tags: [cloudflare, network, security, allowlist, reference]
keywords: [cloudflare ip ranges, edge ips, origin allowlist, cidr, firewall rules]
intent_keywords:
  - what are cloudflare's ip ranges
  - cloudflare ips to allowlist on my origin
  - cloudflare edge cidr list
auth: [CLOUDFLARE_API_TOKEN]
params: []
outputs:
  - name: family
    type: string
    description: ipv4 or ipv6
  - name: cidr
    type: string
    description: A single CIDR block Cloudflare serves traffic from
cost:
  fan_out: none
  expensive: false
  notes: Single unauthenticated call; the list changes rarely
related:
  - cloudflare/zones/zones-list
last_verified: "2026-07-30"
---

Returns Cloudflare's published edge IP ranges, one CIDR per row across both
address families. This is the list an origin's firewall should allow so that
only Cloudflare can reach it directly - locking the origin to these ranges is
what stops attackers bypassing the edge by hitting the origin address.

## Query

```sql
SELECT 'ipv4' AS family, json_each.value AS cidr
FROM cloudflare.ips.ips, json_each(ipv4_cidrs)
UNION ALL
SELECT 'ipv6' AS family, json_each.value AS cidr
FROM cloudflare.ips.ips, json_each(ipv6_cidrs);
```

## Variation: raw arrays and change token

The etag changes when Cloudflare revises the ranges, so it is the value to
store and compare on a schedule rather than diffing the lists:

```sql
SELECT ipv4_cidrs, ipv6_cidrs, etag
FROM cloudflare.ips.ips;
```

## Notes

The underlying endpoint is a single row holding two JSON arrays, so the
json_each explosion is what makes it usable as an allowlist - fifteen IPv4
and seven IPv6 ranges at the time of writing. The endpoint needs no
Cloudflare credentials, but stackql still requires the token environment
variable to be present because authentication is configured per provider
rather than per operation: with CLOUDFLARE_API_TOKEN unset the query fails
with 'credentials error: credentialsenvvar references empty string' rather
than succeeding anonymously, so set the variable to any non-empty value if
you have no token. jdcloud_cidrs is null unless the account is on the China
network. Both address families must be allowed on a dual-stack origin;
allowing only IPv4 silently blocks Cloudflare's IPv6 egress. Poll on a
schedule and compare the etag rather than assuming the list is static.
