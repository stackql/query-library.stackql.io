---
title: Lambda functions in a region
description: Lists Lambda functions in one region with runtime, architecture, memory, timeout and execution role in a single call.
verb: select
status: stable
providers: [aws]
services: [lambda]
tags: [aws, lambda, serverless, inventory]
keywords: [function list, lambda inventory, serverless functions, runtime]
intent_keywords:
  - list lambda functions
  - what lambda functions exist
  - lambda function inventory
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["lambda:ListFunctions"]
params:
  - name: region
    type: identifier
    required: true
    description: Region to list functions in
    example: us-east-1
outputs:
  - name: function_name
    type: string
    description: Function name
  - name: runtime
    type: string
    description: Managed runtime identifier, e.g. python3.12; null for container image functions
  - name: architecture
    type: string
    description: x86_64 or arm64
  - name: memory_size
    type: number
    description: Memory allocation in MB, which also determines CPU share
  - name: timeout
    type: number
    description: Maximum execution time in seconds
  - name: package_type
    type: string
    description: Zip or Image
  - name: code_size
    type: number
    description: Deployment package size in bytes
  - name: last_modified
    type: string
    description: Last update timestamp
  - name: role
    type: string
    description: Execution role ARN
cost:
  fan_out: region
  expensive: false
  notes: One list call per region when swept account-wide
related:
  - aws/lambda/function-analytics
  - aws/lambda/public-access-policies
  - aws/ec2/regions-enabled
last_verified: "2026-07-29"
---

Lists every Lambda function in a region with the configuration that answers
most inventory asks - runtime, architecture, memory, timeout and execution
role - in a single call. Lambda is regional, so fan out over the enabled
regions from aws/ec2/regions-enabled for an account-wide inventory.

## Query

```sql
SELECT
function_name,
runtime,
json_extract(architectures, '$[0]') as architecture,
memory_size,
timeout,
package_type,
code_size,
last_modified,
role
FROM aws.lambda.functions
WHERE region = '{{region}}';
```

## Variation: cheap name-only enumeration

The Cloud Control list-only resource returns identifiers alone, which is
enough when the next step is a keyed read per function:

```sql
SELECT function_name
FROM awscc.lambda.functions_list_only
WHERE region = '{{region}}';
```

## Variation: full detail for one function

Supplying function_name routes to GetFunction, which returns the code
location, concurrency and tags alongside the configuration - none of which
appear in the list response:

```sql
SELECT code, configuration, concurrency, tags
FROM aws.lambda.functions
WHERE region = '{{region}}'
AND function_name = 'my-function';
```

## Notes

The same resource serves two operations: region alone lists every function
with full configuration, while adding function_name routes to GetFunction
and returns a different column set (code, configuration, concurrency, tags),
so a projection valid for one form fails against the other. architectures is
a JSON array - functions declare exactly one architecture today, so element
0 is the value. runtime is null for container image functions, where
package_type is Image and the runtime lives in the image itself. memory_size
determines CPU allocation as well as memory. The awscc list-only variation
needs cloudformation:ListResources in addition to the Lambda action.
