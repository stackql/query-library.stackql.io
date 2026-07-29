---
title: Lambda functions with public resource policies
description: Reads a Lambda function's resource policy and flags statements granting invoke rights to a wildcard principal; the public-invoke exposure check.
verb: select
status: draft
providers: [aws]
services: [lambda]
tags: [aws, lambda, security, cspm, serverless]
keywords: [resource policy, public lambda, wildcard principal, invoke permission, function url]
intent_keywords:
  - which lambda functions are public
  - lambda resource policy allowing star principal
  - can anyone invoke my lambda
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["lambda:GetPolicy"]
params:
  - name: region
    type: identifier
    required: true
    description: Region the function is in
    example: us-east-1
  - name: function_name
    type: string
    required: true
    description: Function to read the policy of; iterate the region's functions for a full sweep
    example: my-function
outputs:
  - name: function_name
    type: string
    description: Function the policy belongs to
  - name: allows_wildcard_principal
    type: string
    description: true when a statement names * as the principal
  - name: has_source_arn_condition
    type: string
    description: true when the policy conditions on AWS:SourceArn
  - name: has_source_account_condition
    type: string
    description: true when the policy conditions on AWS:SourceAccount
  - name: policy
    type: string
    description: Full resource policy document as JSON; read it to confirm a finding
cost:
  fan_out: account
  expensive: false
  notes: One call per function when swept across a region
related:
  - aws/lambda/functions-list
  - aws/lambda/function-analytics
---

Reads the resource policy attached to a Lambda function and flags whether any
statement grants invoke rights to a wildcard principal. A wildcard principal
without a narrowing condition means anyone can invoke the function. Policies
are per-function, so enumerate with aws/lambda/functions-list and iterate this
query over the results.

## Query

```sql
SELECT
'{{function_name}}' as function_name,
CASE WHEN instr(policy, '"Principal":"*"') > 0 OR instr(policy, '"AWS":"*"') > 0 THEN 'true' ELSE 'false' END as allows_wildcard_principal,
CASE WHEN instr(policy, 'AWS:SourceArn') > 0 THEN 'true' ELSE 'false' END as has_source_arn_condition,
CASE WHEN instr(policy, 'AWS:SourceAccount') > 0 THEN 'true' ELSE 'false' END as has_source_account_condition,
policy
FROM aws.lambda.policies
WHERE region = '{{region}}'
AND function_name = '{{function_name}}';
```

## Related exposure: public function URLs

A function URL with auth_type NONE is publicly invokable over HTTPS
regardless of the resource policy, and is the other way a Lambda ends up
exposed:

```sql
SELECT function_url, auth_type, function_arn
FROM aws.lambda.function_url_configs
WHERE region = '{{region}}'
AND function_name = '{{function_name}}';
```

## Notes

An empty result means the function has no resource policy at all, which is
the safe state - the API raises ResourceNotFoundException and stackql
surfaces it as zero rows, not an error. A wildcard principal is not
automatically a finding: AWS service integrations legitimately add
statements with a service principal or with Principal * narrowed by an
AWS:SourceArn or AWS:SourceAccount condition, which is why those conditions
are flagged separately. Treat a wildcard principal with neither condition as
the real exposure, and always read the returned policy document before
reporting. The policy is a JSON string whose Statement key may hold an
object or an array depending on statement count, so string matching is more
robust here than positional JSON extraction. The function_name column is
projected from the parameter because the policy resource returns only the
policy document and its revision id.
