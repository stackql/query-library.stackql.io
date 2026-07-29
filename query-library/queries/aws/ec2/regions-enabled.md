---
title: Enabled AWS regions
description: Lists the AWS regions enabled for the account with endpoint, country and opt-in status; the valid fan-out list for region-swept queries.
verb: select
status: stable
providers: [aws]
services: [ec2]
tags: [aws, ec2, regions, inventory]
keywords: [enabled regions, region sweep, opt-in status, all regions]
intent_keywords:
  - list enabled aws regions
  - which regions are enabled
  - enumerate aws regions
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["ec2:DescribeRegions"]
params:
  - name: seed_region
    type: identifier
    required: false
    default: us-east-1
    description: Routing region for the describe-regions call; any enabled region works
    example: us-east-1
outputs:
  - name: endpoint
    type: string
    description: EC2 service endpoint for the region
  - name: country
    type: string
    description: Country name extracted from the geography object
  - name: opt_in_status
    type: string
    description: opt-in-not-required, opted-in or not-opted-in
  - name: region_name
    type: string
    description: Region identifier
cost:
  fan_out: none
  expensive: false
last_verified: "2026-07-29"
---

Returns the AWS regions enabled for the account. Run this first when planning
any multi-region sweep: querying a region the account has not opted into
fails, and by default this call returns only enabled regions, so the result
set is exactly the valid fan-out list for every other AWS query.

## Query

```sql
SELECT
endpoint,
JSON_EXTRACT(geography, '$.item.name') as country,
opt_in_status,
region_name
FROM aws.ec2.regions
WHERE region = '{{seed_region}}';
```

## Variation: all regions including not opted in

Add all_regions = true to include regions the account has not opted into,
e.g. to find opt-in candidates:

```sql
SELECT
endpoint,
JSON_EXTRACT(geography, '$.item.name') as country,
opt_in_status,
region_name
FROM aws.ec2.regions
WHERE region = '{{seed_region}}'
AND all_regions = true;
```

## PostgreSQL backend dialect

JSON_EXTRACT is the default embedded SQLite backend's dialect; on a
PostgreSQL-backed stackql instance extract the country with
json_extract_path_text:

```sql
SELECT
endpoint,
json_extract_path_text(geography::json, 'item', 'name') as country,
opt_in_status,
region_name
FROM aws.ec2.regions
WHERE region = '{{seed_region}}';
```

## Notes

region is a routing parameter, not a filter: the call is account-global and
any enabled region answers for all of them. The default result contains only
regions enabled for the account (opt_in_status opt-in-not-required or
opted-in), so no client-side exclusion is needed before fanning out with
WHERE region IN (...). With all_regions = true the result adds not-opted-in
regions. geography is a JSON object; extract the country with
JSON_EXTRACT(geography, '$.item.name') on the default SQLite backend or
json_extract_path_text(geography::json, 'item', 'name') on PostgreSQL.
