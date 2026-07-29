---
title: EC2 instances in a region
description: Lists EC2 instances in one region with type, state, addressing and network placement.
verb: select
status: stable
providers: [aws]
services: [ec2]
tags: [aws, ec2, compute, inventory]
keywords: [ec2 inventory, instance list, running instances]
intent_keywords:
  - list ec2 instances
  - what instances are running
  - ec2 instance inventory
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["ec2:DescribeInstances"]
params:
  - name: region
    type: identifier
    required: true
    description: Region to list instances in
    example: ap-southeast-2
outputs:
  - name: instance_id
    type: string
    description: Instance identifier
  - name: instance_type
    type: string
    description: Instance type, e.g. t3.micro
  - name: state_name
    type: string
    description: Instance state name - running, stopped, terminated
  - name: private_ip_address
    type: string
    description: Primary private IPv4 address
  - name: public_ip_address
    type: string
    description: Public IPv4 address; the string null when the instance has none
  - name: launch_time
    type: string
    description: Launch timestamp
  - name: vpc_id
    type: string
    description: VPC the instance is in
  - name: subnet_id
    type: string
    description: Subnet the instance is in
cost:
  fan_out: region
  expensive: false
  notes: One describe call per region when swept account-wide
related:
  - aws/ec2/regions-enabled
  - aws/ec2/instance-state-management
  - aws/tagging/resources-by-tag
last_verified: "2026-07-29"
---

Lists every EC2 instance in a single region with the fields that answer most
inventory asks: type, state, private and public addressing, and network
placement. For an account-wide inventory, run aws/ec2/regions-enabled first
and fan this query out over the enabled regions.

## Query

```sql
SELECT
instance_id,
instance_type,
json_extract(state, '$.name') as state_name,
private_ip_address,
public_ip_address,
launch_time,
vpc_id,
subnet_id
FROM aws.ec2.instances
WHERE region = '{{region}}';
```

## Variation: instance names from tags

EC2 is ID-centric - the human-meaningful name lives in the Name tag. Explode
the tags array in a subquery and filter on the tag key in the outer query:

```sql
SELECT instance_id, instance_type, state_name, name_tag FROM (
SELECT
instance_id,
instance_type,
json_extract(state, '$.name') as state_name,
json_extract(json_each.value, '$.key') as tag_key,
json_extract(json_each.value, '$.value') as name_tag
FROM aws.ec2.instances, json_each(json_extract(tags, '$.item'))
WHERE region = '{{region}}'
) t WHERE tag_key = 'Name';
```

## PostgreSQL backend dialect

json_extract and json_each are the default embedded SQLite backend's
dialect; on a PostgreSQL-backed instance use json_extract_path_text:

```sql
SELECT
instance_id,
instance_type,
json_extract_path_text(state::json, 'name') as state_name,
private_ip_address,
public_ip_address,
launch_time,
vpc_id,
subnet_id
FROM aws.ec2.instances
WHERE region = '{{region}}';
```

## Notes

state is a JSON object with lowercase keys ({"code":80,"name":"stopped"}),
so extract the name rather than comparing the column directly; code 16 is
running and 80 is stopped. public_ip_address is the string null for
instances with no public IP, not SQL NULL. Terminated instances stay visible
for about an hour after termination, so filter on state_name when counting
live capacity. tags is an object wrapping an item array of key/value pairs.
In the tags variation the tag_key filter must sit in the outer query: a
predicate on a json_each expression in the same WHERE clause as the table
function is silently dropped, returning every tag instead of the one asked
for. To find instances by tag across a region, use
aws/tagging/resources-by-tag instead.
