---
title: EC2 instance state and lifecycle control
description: Reports instance state and health checks for a region, and covers the stop and start lifecycle operations that change it.
verb: select
status: stable
providers: [aws]
services: [ec2]
tags: [aws, ec2, compute, lifecycle, operations]
keywords: [instance state, status checks, stop instance, start instance, power off]
intent_keywords:
  - what state are my ec2 instances in
  - stop an ec2 instance
  - start an ec2 instance
  - check instance status checks
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["ec2:DescribeInstanceStatus"]
params:
  - name: region
    type: identifier
    required: true
    description: Region the instances are in
    example: ap-southeast-2
outputs:
  - name: instance_id
    type: string
    description: Instance identifier
  - name: state_name
    type: string
    description: running, stopped, pending, stopping, shutting-down or terminated
  - name: instance_check
    type: string
    description: Instance status check - ok, impaired, insufficient-data or not-applicable
  - name: system_check
    type: string
    description: System status check - ok, impaired, insufficient-data or not-applicable
  - name: availability_zone
    type: string
    description: Availability zone the instance runs in
  - name: events
    type: string
    description: Scheduled maintenance events affecting the instance
cost:
  fan_out: region
  expensive: false
  notes: One describe call per region when swept account-wide
related:
  - aws/ec2/instances-by-region
  - aws/ec2/instance-create
  - aws/ec2/regions-enabled
last_verified: "2026-07-29"
---

Reports the current state of every instance in a region alongside its two
health checks. The instance check covers the guest (reachability, OS-level
failure); the system check covers the underlying host and network. Use this
to confirm a lifecycle operation completed, or to find instances that are
running but impaired.

## Query

```sql
SELECT
instance_id,
json_extract(instance_state, '$.name') as state_name,
json_extract(instance_status, '$.status') as instance_check,
json_extract(system_status, '$.status') as system_check,
availability_zone,
events
FROM aws.ec2.instance_status
WHERE region = '{{region}}'
AND IncludeAllInstances = true;
```

## Stopping an instance

Stopping is a lifecycle operation (EXEC), not a configuration change. It
returns as soon as the instance enters the stopping state, so poll the query
above until state_name is stopped:

```sql
EXEC aws.ec2.instances.stop_instances
@InstanceId='i-0abcd1234ef567890',
@region='{{region}}';
```

## Starting an instance

```sql
EXEC aws.ec2.instances.start_instances
@InstanceId='i-0abcd1234ef567890',
@region='{{region}}';
```

## Notes

IncludeAllInstances = true is load-bearing: without it DescribeInstanceStatus
returns only running instances, so stopped instances vanish from the result
and an incomplete inventory looks like a complete one. instance_state,
instance_status and system_status are all JSON objects - the state name is at
$.name and each check result at $.status - and both checks read
not-applicable while an instance is stopped rather than reporting a failure.
Stop and start are asynchronous: they return on the state transition
starting, not completing, so re-run the status query until the state
settles. stop_instances also accepts optional @Hibernate, @Force,
@SkipOsShutdown and @DryRun booleans, and start_instances accepts
@AdditionalInfo and @DryRun. Stopping preserves EBS volumes and loses
instance-store data; a stopped instance keeps its private IP but releases a
non-elastic public IP, so the address changes on restart. To reboot in place
use EXEC aws.ec2.instances.reboot_instances with the same arguments, and to
terminate use DELETE FROM aws.ec2.instances WHERE region = '<region>' AND
InstanceId = '<instance_id>'.
