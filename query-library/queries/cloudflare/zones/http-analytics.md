---
title: Cloudflare HTTP request analytics by country and status
description: Returns HTTP request volume for a zone grouped by minute, country, method and response status; the GraphQL analytics replacement for the sunset dashboard endpoint.
verb: select
status: stable
providers: [cloudflare]
services: [zones]
tags: [cloudflare, analytics, zones, traffic, graphql]
keywords: [http analytics, requests by country, traffic analysis, adaptive groups, edge status]
intent_keywords:
  - how much traffic is my site getting
  - cloudflare requests by country
  - http status code breakdown
auth: [CLOUDFLARE_API_TOKEN]
params:
  - name: zone_tag
    type: string
    required: true
    description: Zone id to report on; zone_tag rather than zone_id on the analytics surface
    example: 37527dd5b6594e3606c526472f80eae5
  - name: since
    type: string
    required: true
    description: Window start as an RFC3339 timestamp
    example: "2026-07-29T00:00:00Z"
  - name: until
    type: string
    required: true
    description: Window end as an RFC3339 timestamp
    example: "2026-07-30T00:00:00Z"
outputs:
  - name: datetime
    type: string
    description: Minute bucket the row aggregates
  - name: country
    type: string
    description: Client country name
  - name: method
    type: string
    description: HTTP request method
  - name: status
    type: number
    description: Edge response status code
  - name: requests
    type: number
    description: Request count in the bucket
  - name: bytes
    type: number
    description: Bytes served
  - name: visits
    type: number
    description: Visit count
cost:
  fan_out: none
  expensive: false
  notes: One GraphQL call per zone and window; wide windows return many rows
related:
  - cloudflare/zones/zones-list
last_verified: "2026-07-30"
---

Returns HTTP request volume for a zone, one row per minute, country, method
and response status. This is the replacement for the sunset REST endpoint
/zones/{zone_id}/analytics/dashboard: the data now comes from Cloudflare's
GraphQL analytics API, exposed here as an ordinary table.

## Query

```sql
SELECT
datetime,
client_country_name AS country,
client_request_http_method_name AS method,
edge_response_status AS status,
requests,
bytes,
visits
FROM cloudflare.zones.http_requests_adaptive_groups
WHERE zone_tag = '{{zone_tag}}'
AND since = '{{since}}'
AND until = '{{until}}'
ORDER BY requests DESC
LIMIT 100;
```

## Variation: traffic by country only

```sql
SELECT
client_country_name AS country,
sum(requests) AS total_requests
FROM cloudflare.zones.http_requests_adaptive_groups
WHERE zone_tag = '{{zone_tag}}'
AND since = '{{since}}'
AND until = '{{until}}'
GROUP BY client_country_name
ORDER BY sum(requests) DESC;
```

## Notes

The parameter is zone_tag here, not zone_id as on the REST-backed zone
resources - the analytics surface keeps Cloudflare's GraphQL naming. since
and until are both required and must be RFC3339 timestamps; the retention
window depends on plan, so a request reaching further back than the plan
allows returns no rows rather than an error. The token needs Account ->
Analytics -> Read in addition to zone access, and a token without it fails
with an authentication error rather than an empty result. Rows are
pre-aggregated per minute per dimension combination, so a busy zone over a
wide window returns a large result - keep the window tight or aggregate in
SQL as the variation does. ORDER BY on an aggregate must repeat the
expression rather than reference its alias.
