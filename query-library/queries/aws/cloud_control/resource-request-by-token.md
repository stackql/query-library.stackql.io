---
title: Cloud Control resource request by token
description: Gets the progress event for one Cloud Control resource request by its request token; poll it until the operation completes.
verb: select
status: draft
providers: [awscc]
services: [cloud_control]
tags: [aws, cloud_control, operations, async]
keywords: [request token, progress event, poll request, async status]
intent_keywords:
  - check cloud control request status
  - poll an aws request token
  - is my cloud control update finished
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
params:
  - name: region
    type: identifier
    required: true
    description: Region the request was made in
    example: ap-southeast-2
  - name: request_token
    type: string
    required: true
    description: Request token returned by the originating mutation
    example: 54061545-e0a0-4ef0-b213-41fda81d8c24
outputs:
  - name: Identifier
    type: string
    description: Identifier of the resource the request targets
  - name: Operation
    type: string
    description: CREATE, UPDATE or DELETE
  - name: OperationStatus
    type: string
    description: PENDING, IN_PROGRESS, SUCCESS, FAILED or CANCEL states
  - name: StatusMessage
    type: string
    description: Human-readable progress or failure detail
  - name: ErrorCode
    type: string
    description: Failure code when the operation failed, empty otherwise
  - name: RetryAfter
    type: string
    description: Suggested wait before polling again
  - name: ResourceModel
    type: string
    description: Resource state on completion
  - name: TypeName
    type: string
    description: Resource type, e.g. AWS::Logs::LogGroup
  - name: EventTime
    type: string
    description: Timestamp of the latest progress event
cost:
  fan_out: none
  expensive: false
related:
  - aws/cloud_control/resource-requests-by-status
  - aws/logs/log-group-retention-update
---

Gets the current progress event for a single Cloud Control resource request.
The request token comes from the RETURNING clause of the originating
asynchronous mutation; poll this query until the operation reaches a terminal
status.

## Query

```sql
SELECT Identifier, Operation, OperationStatus, StatusMessage, ErrorCode, RetryAfter, ResourceModel, TypeName, EventTime
FROM awscc.cloud_control.resource_request
WHERE RequestToken = '{{request_token}}'
AND region = '{{region}}';
```

## Notes

Poll until OperationStatus is SUCCESS or FAILED; RetryAfter suggests how long
to wait between polls. On failure, StatusMessage and ErrorCode carry the
reason. On success, ResourceModel carries the resulting resource state, or
re-read the resource directly. An unknown or expired token fails the request
- completed requests age out of the service's history.
