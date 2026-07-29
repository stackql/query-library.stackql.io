---
title: Find AWS resource identifiers by tag
description: Resolves identifiers for ID-centric AWS resource types by querying the tagging API with a resource type and tag filter; returns ARNs, extracted ids and tags.
verb: select
status: stable
providers: [awscc]
services: [tagging]
tags: [aws, tagging, identifiers, inventory]
keywords: [tagged resources, resource arn, tag filters, id centric, find by tag]
intent_keywords:
  - find aws resources by tag
  - get vpc id from tags
  - look up resource ids by tag
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["tag:GetResources"]
params:
  - name: region
    type: identifier
    required: true
    description: Region to search in
    example: ap-southeast-2
  - name: resource_type
    type: string
    required: true
    description: Resource type filter in service:resourceType form, e.g. ec2:vpc, ec2:subnet, ec2:security-group
    example: ec2:vpc
  - name: tag_key
    type: string
    required: true
    description: Tag key to match
    example: stackql:stack-name
  - name: tag_value
    type: string
    required: true
    description: Tag value to match
    example: sqlserver-migration-lab
outputs:
  - name: resource_arn
    type: string
    description: Full ARN of the matching resource
  - name: resource_id
    type: string
    description: Identifier extracted from the ARN (last /-delimited segment)
  - name: key
    type: string
    description: Tag key (one row per tag on each matching resource)
  - name: value
    type: string
    description: Tag value
cost:
  fan_out: region
  expensive: false
  notes: One call per region and resource type when swept
last_verified: "2026-07-29"
---

Several AWS services are ID-centric rather than name-centric: resources such
as VPCs, subnets and security groups are addressable only by a generated
identifier, and their human-meaningful names live in tags. This query
resolves tags to identifiers through the resource groups tagging API: filter
by resource type and a tag, get back the ARN, the extracted id and every tag
on each matching resource. The identifiers feed WHERE clauses in follow-up
queries against the resource's own service.

## Query

```sql
SELECT resource_arn, resource_id, key, value FROM
(
SELECT
ResourceARN as resource_arn,
split_part(ResourceARN, '/', -1) as resource_id,
json_extract(json_each.value, '$.Key') as key,
json_extract(json_each.value, '$.Value') as value
FROM awscc.tagging.tagged_resources, json_each(tags)
WHERE region = '{{region}}'
AND ResourceTypeFilters = '["{{resource_type}}"]'
AND TagFilters = '[{"Key": "{{tag_key}}", "Values": ["{{tag_value}}"]}]'
) t;
```

## Variation: discover tags for a resource type

Drop TagFilters to list every tagged resource of the type with its tags -
useful for discovering what keys and values exist before filtering:

```sql
SELECT
ResourceARN as resource_arn,
split_part(ResourceARN, '/', -1) as resource_id,
json_extract(json_each.value, '$.Key') as key,
json_extract(json_each.value, '$.Value') as value
FROM awscc.tagging.tagged_resources, json_each(tags)
WHERE region = '{{region}}'
AND ResourceTypeFilters = '["{{resource_type}}"]';
```

## PostgreSQL backend dialect

The JSON functions above are the default embedded SQLite backend's dialect.
On a PostgreSQL-backed stackql instance, explode the tags array with
json_array_elements_text and extract with json_extract_path_text instead:

```sql
SELECT
ResourceARN as resource_arn,
split_part(ResourceARN, '/', -1) as resource_id,
json_extract_path_text(tag::json, 'Key') as key,
json_extract_path_text(tag::json, 'Value') as value
FROM awscc.tagging.tagged_resources,
json_array_elements_text(tags::json) as tag
WHERE region = '{{region}}'
AND ResourceTypeFilters = '["{{resource_type}}"]'
AND TagFilters = '[{"Key": "{{tag_key}}", "Values": ["{{tag_value}}"]}]';
```

## Notes

TagFilters is a JSON array: multiple filter objects must all match (AND),
while multiple entries in one filter's Values list match any (OR), e.g.
'[{"Key": "stackql:stack-name", "Values": ["sqlserver-migration-lab"]},
{"Key": "stackql:stack-env", "Values": ["dev"]}]'. ResourceTypeFilters also
accepts multiple entries. All tags of each matching resource are returned,
not just the filtered key. resource_id takes the last /-delimited ARN
segment, which suits most ARN formats (vpc/vpc-..., subnet/subnet-...); for
resource types whose ARN ends in a :-delimited id, split on ':' instead. The
JSON exploding functions are backend dialect: json_each/json_extract on the
default embedded SQLite backend, json_array_elements_text with
json_extract_path_text on PostgreSQL.
