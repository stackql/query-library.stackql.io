---
title: Cloud Control resource requests by status
description: Lists recent Cloud Control resource requests in a region filtered by operation and status; the follow-up surface for asynchronous AWS mutations.
verb: select
status: stable
providers: [awscc]
services: [cloud_control]
tags: [aws, cloud_control, operations, async, inventory]
keywords: [resource request status, async mutation, progress event, failed requests]
intent_keywords:
  - list failed cloud control requests
  - check status of my aws mutations
  - what cloud control operations are in progress
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
params:
  - name: region
    type: identifier
    required: true
    description: Region the requests were made in
    example: ap-southeast-2
  - name: operation
    type: enum
    required: true
    enum: [CREATE, UPDATE, DELETE]
    description: Operation type to filter on
    example: CREATE
  - name: operation_status
    type: enum
    required: true
    enum: [PENDING, IN_PROGRESS, SUCCESS, FAILED, CANCEL_IN_PROGRESS, CANCEL_COMPLETE]
    description: Operation status to filter on
    example: FAILED
outputs:
  - name: Identifier
    type: string
    description: Identifier of the resource the request targets
  - name: Operation
    type: string
    description: CREATE, UPDATE or DELETE
  - name: OperationStatus
    type: string
    description: Current status of the request
  - name: StatusMessage
    type: string
    description: Human-readable progress or failure detail
  - name: ErrorCode
    type: string
    description: Failure code when the operation failed, empty otherwise
  - name: TypeName
    type: string
    description: Resource type, e.g. AWS::Logs::LogGroup
  - name: RequestToken
    type: string
    description: Token keying the request; use it for a single-request lookup
  - name: EventTime
    type: string
    description: Timestamp of the latest progress event
cost:
  fan_out: region
  expensive: false
  notes: One list call per region when swept across regions
related:
  - aws/cloud_control/resource-request-by-token
  - aws/logs/log-group-retention-update
last_verified: "2026-07-29"
---

Mutations against Cloud Control backed AWS resources (INSERT, UPDATE, DELETE)
are asynchronous: each returns a progress event and completes in the
background. This query lists recent requests in a region matching an
operation type and status - the entry point for "did my changes complete"
and "what failed" asks.

## Query

```sql
SELECT Identifier, Operation, OperationStatus, StatusMessage, ErrorCode, TypeName, RequestToken, EventTime
FROM awscc.cloud_control.resource_requests
WHERE ResourceRequestStatusFilter = '{"OperationStatuses": ["{{operation_status}}"], "Operations": ["{{operation}}"]}'
AND region = '{{region}}';
```

## Notes

ResourceRequestStatusFilter is a JSON document and both lists accept multiple
values - widen the filter by editing it, e.g. '{"OperationStatuses":
["FAILED"], "Operations": ["CREATE", "UPDATE"]}'. Common asks: FAILED CREATE
requests after provisioning, SUCCESS UPDATE requests to confirm completion,
IN_PROGRESS to see what is still running. An empty result means no matching
requests in the region's recent history - completed requests age out. Use the
RequestToken with aws/cloud_control/resource-request-by-token to poll a
single request.
