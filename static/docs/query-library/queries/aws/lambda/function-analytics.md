---
title: Lambda fleet analytics by runtime and architecture
description: Summarises a region's Lambda functions by runtime and architecture with counts and memory totals; the runtime modernisation and Graviton migration view.
verb: select
status: stable
providers: [aws]
services: [lambda]
tags: [aws, lambda, serverless, analytics, inventory]
keywords: [runtime summary, graviton migration, deprecated runtime, fleet profile, arm64]
intent_keywords:
  - what runtimes are my lambdas using
  - summarise my lambda functions
  - how many lambdas are on arm64
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["lambda:ListFunctions"]
params:
  - name: region
    type: identifier
    required: true
    description: Region to summarise
    example: us-east-1
outputs:
  - name: runtime
    type: string
    description: Managed runtime identifier; null for container image functions
  - name: architecture
    type: string
    description: x86_64 or arm64
  - name: function_count
    type: number
    description: Number of functions on that runtime and architecture
  - name: total_memory_mb
    type: number
    description: Sum of configured memory across those functions
  - name: avg_memory_mb
    type: number
    description: Mean configured memory
  - name: max_timeout_seconds
    type: number
    description: Longest configured timeout in the group
cost:
  fan_out: region
  expensive: false
  notes: One list call per region when swept account-wide
related:
  - aws/lambda/functions-list
  - aws/lambda/public-access-policies
last_verified: "2026-07-29"
---

Profiles a region's Lambda fleet by runtime and architecture. This is the
view behind two recurring programmes of work: runtime modernisation, where
functions on runtimes past their deprecation date stop receiving security
patches and eventually cannot be updated, and Graviton migration, where
moving x86_64 functions to arm64 cuts cost at equivalent performance.

## Query

```sql
SELECT
runtime,
architecture,
count(*) as function_count,
sum(memory_size) as total_memory_mb,
avg(memory_size) as avg_memory_mb,
max(timeout) as max_timeout_seconds
FROM (
SELECT
runtime,
json_extract(architectures, '$[0]') as architecture,
memory_size + 0 as memory_size,
timeout + 0 as timeout
FROM aws.lambda.functions
WHERE region = '{{region}}'
) t
GROUP BY runtime, architecture
ORDER BY count(*) DESC;
```

## Variation: architecture split only

The Graviton migration view - how much of the fleet is still on x86_64:

```sql
SELECT
architecture,
count(*) as function_count,
sum(memory_size) as total_memory_mb
FROM (
SELECT
json_extract(architectures, '$[0]') as architecture,
memory_size + 0 as memory_size
FROM aws.lambda.functions
WHERE region = '{{region}}'
) t
GROUP BY architecture;
```

## Notes

The aggregation runs client-side over the list response, so it costs one API
call regardless of fleet size. The numeric columns need the + 0 coercion in
the subquery: memory_size and timeout arrive as text, and without it sum and
avg produce zero and comparisons order lexicographically. ORDER BY must
repeat the aggregate expression rather than reference its alias - ORDER BY
count(*) DESC works where ORDER BY function_count DESC fails with a no such
column error. Check the runtime
values returned against the AWS Lambda runtime deprecation calendar rather
than a hardcoded list - deprecation dates move and each runtime retires on
its own schedule. A null runtime with package_type Image is a container
image function, which is not subject to managed runtime deprecation but
carries its own base image patching obligation. Rank remediation by
function_count, then by total_memory_mb as a rough proxy for spend.
