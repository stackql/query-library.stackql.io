---
title: EC2 instance type specifications
description: Looks up vCPU, memory, architecture and capability details for named EC2 instance types; the architecture check before launching an instance.
verb: select
status: stable
providers: [aws]
services: [ec2]
tags: [aws, ec2, compute, sizing, reference]
keywords: [instance type specs, vcpus, memory, architecture, arm64, graviton, sizing]
intent_keywords:
  - what are the specs of an instance type
  - how much memory does an instance type have
  - is this instance type arm64 or x86
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["ec2:DescribeInstanceTypes"]
params:
  - name: region
    type: identifier
    required: true
    description: Region to check availability in; type availability varies by region
    example: ap-southeast-2
  - name: instance_type
    type: string
    required: true
    description: Instance type to look up
    example: t4g.nano
outputs:
  - name: instance_type
    type: string
    description: Instance type name
  - name: vcpus
    type: number
    description: Default vCPU count
  - name: memory_mib
    type: number
    description: Memory in MiB
  - name: architecture
    type: string
    description: Supported architecture - arm64, x86_64, or a JSON array when several are supported
  - name: processor
    type: string
    description: Processor manufacturer - AWS, Intel, AMD or Apple
  - name: current_generation
    type: boolean
    description: Whether the type is current generation
  - name: burstable_performance_supported
    type: boolean
    description: Whether this is a burstable T-family type
  - name: free_tier_eligible
    type: boolean
    description: Whether the type is free tier eligible
  - name: hibernation_supported
    type: boolean
    description: Whether on-demand hibernation is supported
cost:
  fan_out: none
  expensive: false
related:
  - aws/ec2/instance-create
  - aws/ec2/instances-by-region
last_verified: "2026-07-29"
---

Looks up the specifications of a named EC2 instance type in a region. The
main operational use is the architecture check before a launch: Graviton
types (t4g, c7g, m8g and similar) need an arm64 AMI while Intel and AMD types
need x86_64, and a mismatch fails the launch. Type availability varies by
region, so the region parameter is a real filter here, not just routing.

## Query

```sql
SELECT
instance_type,
json_extract(v_cpu_info, '$.defaultVCpus') + 0 as vcpus,
json_extract(memory_info, '$.sizeInMiB') + 0 as memory_mib,
json_extract(processor_info, '$.supportedArchitectures.item') as architecture,
json_extract(processor_info, '$.manufacturer') as processor,
current_generation,
burstable_performance_supported,
free_tier_eligible,
hibernation_supported
FROM aws.ec2.instance_types
WHERE region = '{{region}}'
AND InstanceType = '{{instance_type}}';
```

## Variation: compare several types

Pass a list to compare candidates side by side; the filter is pushed to the
API so every named type is returned:

```sql
SELECT
instance_type,
json_extract(v_cpu_info, '$.defaultVCpus') + 0 as vcpus,
json_extract(memory_info, '$.sizeInMiB') + 0 as memory_mib,
json_extract(processor_info, '$.supportedArchitectures.item') as architecture
FROM aws.ec2.instance_types
WHERE region = '{{region}}'
AND InstanceType IN ('t4g.nano', 't4g.micro', 't3.micro')
ORDER BY memory_mib;
```

## Notes

Always name the types you want with InstanceType: an unfiltered select
returns only the first page of about 100 types out of roughly 850, with no
error and no indication of truncation, so filtering that result client-side
silently produces incomplete answers - never use it to search for types
matching a size or architecture. The Filter input param is declared on the
resource but returns an empty result rather than filtering, so avoid it.
json_extract returns text, so numeric comparisons need the + 0 coercion
shown above; without it memory_mib <= 2048 compares lexicographically and
quietly excludes matches (CAST(x AS INTEGER) does not parse in stackql).
architecture comes back as a bare string for single-architecture types and
as a JSON array for types supporting several (older types report
["i386","x86_64"]). Instance sizing detail beyond these columns is available
in the network_info, ebs_info, gpu_info and instance_storage_info JSON
columns.
