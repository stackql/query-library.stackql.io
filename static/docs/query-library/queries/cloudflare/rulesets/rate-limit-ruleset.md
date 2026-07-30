---
title: Cloudflare rate limit ruleset
description: Reads the rate limiting rules on a zone's http_ratelimit phase, and sets or clears them; the entrypoint ruleset pattern used for edge throttling.
verb: select
status: draft
providers: [cloudflare]
services: [rulesets]
tags: [cloudflare, rulesets, rate-limit, security, edge]
keywords: [rate limiting, ruleset phase, throttle, http_ratelimit, entrypoint ruleset]
intent_keywords:
  - show my cloudflare rate limit rules
  - set a rate limit on a zone
  - is rate limiting configured
auth: [CLOUDFLARE_API_TOKEN]
params:
  - name: zone_id
    type: string
    required: true
    description: Zone to read the ruleset phase for
    example: 37527dd5b6594e3606c526472f80eae5
outputs:
  - name: ruleset_id
    type: string
    description: Entrypoint ruleset id for the phase
  - name: rule_id
    type: string
    description: Id of the first rule in the ruleset
  - name: description
    type: string
    description: Rule description
  - name: action
    type: string
    description: Action taken when the limit is exceeded, e.g. block
  - name: threshold
    type: number
    description: Requests allowed per period
  - name: period
    type: number
    description: Sampling period in seconds
  - name: enabled
    type: boolean
    description: Whether the rule is active
cost:
  fan_out: account
  expensive: false
  notes: One call per zone when swept across zones
related:
  - cloudflare/zones/zones-list
  - cloudflare/zones/http-analytics
---

Reads the rate limiting rules attached to a zone's http_ratelimit phase, and
covers replacing and clearing them. Cloudflare models rate limiting as an
entrypoint ruleset on a named phase rather than as individual resources, so
the whole rule list is read and written as one document.

## Query

```sql
SELECT
id AS ruleset_id,
JSON_EXTRACT(rules, '$[0].id') AS rule_id,
JSON_EXTRACT(rules, '$[0].description') AS description,
JSON_EXTRACT(rules, '$[0].action') AS action,
JSON_EXTRACT(rules, '$[0].ratelimit.requests_per_period') AS threshold,
JSON_EXTRACT(rules, '$[0].ratelimit.period') AS period,
JSON_EXTRACT(rules, '$[0].enabled') AS enabled
FROM cloudflare.rulesets.phases
WHERE zone_id = '{{zone_id}}'
AND ruleset_phase = 'http_ratelimit';
```

## Setting a rate limit rule

The write replaces the entire rules array, so include every rule that should
survive - anything omitted is removed:

```sql
REPLACE cloudflare.rulesets.phases
SET rules = '[
  {
    "action": "block",
    "ratelimit": {
      "characteristics": ["ip.src", "cf.colo.id"],
      "period": 60,
      "requests_per_period": 100,
      "mitigation_timeout": 60
    },
    "expression": "len(http.request.uri.path) gt 0",
    "description": "throttle all paths",
    "enabled": true
  }
]'
WHERE zone_id = '{{zone_id}}'
AND ruleset_phase = 'http_ratelimit';
```

## Clearing the rules

```sql
REPLACE cloudflare.rulesets.phases
SET rules = '[]'
WHERE zone_id = '{{zone_id}}'
AND ruleset_phase = 'http_ratelimit';
```

## Notes

A zone with no rate limiting configured returns HTTP 404 with code 10003,
'could not find entrypoint ruleset in the http_ratelimit phase', rather than
an empty result - treat that as "not configured" rather than a failure, and
note the entrypoint ruleset is created implicitly by the first write. The
write is a whole-array replace, not an append, which is what makes clearing
the rules a matter of setting an empty array; it also means a careless write
silently removes existing rules, so read the current document first. The
characteristics list defines what the counter is keyed on - ip.src plus
cf.colo.id counts per client per datacentre. The rules column is JSON, so
positional extraction with '$[0]' only reads the first rule; iterate the
array when a zone carries several. This entry is draft: the read shape is
confirmed against the API and the not-configured response observed, but the
rule writes have not been executed against a live zone.
