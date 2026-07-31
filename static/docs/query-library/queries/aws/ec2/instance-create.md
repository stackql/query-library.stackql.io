---
title: Launch an EC2 instance
description: Launches an EC2 instance through Cloud Control, returning a progress event to poll; user data must be base64 encoded.
verb: mutation
status: draft
providers: [awscc]
services: [ec2]
tags: [aws, ec2, compute, provisioning, mutation]
keywords: [launch instance, run instances, create vm, provision ec2]
intent_keywords:
  - launch an ec2 instance
  - create a new vm in aws
  - provision an ec2 instance
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["cloudformation:CreateResource", "ec2:RunInstances", "ec2:CreateTags", "ec2:DescribeInstances"]
params:
  - name: region
    type: identifier
    required: true
    description: Region to launch in
    example: ap-southeast-2
  - name: image_id
    type: string
    required: true
    pattern: "^ami-[0-9a-f]{8,17}$"
    description: AMI id; must match the instance type's architecture
    example: ami-0f707e657d81da75d
  - name: instance_type
    type: string
    required: true
    description: Instance type; must match the AMI architecture (t4g is arm64, t3 is x86_64)
    example: t4g.nano
  - name: subnet_id
    type: string
    required: true
    pattern: "^subnet-[0-9a-f]{8,17}$"
    description: Subnet to launch into; determines the VPC and availability zone
    example: subnet-05b4d1c749abd4f1b
  - name: user_data
    type: string
    required: true
    description: Base64-encoded boot script; encode before templating, never pass plain text
    example: IyEvYmluL2Jhc2gKZWNobyBoZWxsbwo=
  - name: tags
    type: string
    required: true
    description: JSON array of Key/Value objects
    example: '[{"Key":"Name","Value":"my-instance"}]'
outputs:
  - name: Identifier
    type: string
    description: Instance id; populated when eagerly assigned, otherwise null until the request succeeds
  - name: OperationStatus
    type: string
    description: IN_PROGRESS, SUCCESS, FAILED, PENDING or CANCEL states
  - name: RequestToken
    type: string
    description: Token to poll the request with
  - name: ErrorCode
    type: string
    description: Failure code when the operation fails, empty otherwise
  - name: StatusMessage
    type: string
    description: Human-readable progress or failure detail
  - name: ResourceModel
    type: string
    description: Resource state on completion
  - name: RetryAfter
    type: string
    description: Suggested wait before polling again
  - name: EventTime
    type: string
    description: Timestamp of the progress event
  - name: Operation
    type: string
    description: CREATE for this request
  - name: TypeName
    type: string
    description: AWS::EC2::Instance
cost:
  fan_out: none
  expensive: true
  notes: Launches billable compute; the instance runs until stopped or terminated
related:
  - aws/ec2/instance-state-management
  - aws/ec2/instance-types-lookup
  - aws/cloud_control/resource-request-by-token
  - aws/ec2/instances-by-region
---

Launches an EC2 instance through Cloud Control. The launch is asynchronous:
the statement returns a progress event immediately and the instance is
created in the background, so capture the RequestToken and poll it to
confirm success. This launches billable compute - the instance runs until
explicitly stopped or terminated.

## Query

```sql
INSERT INTO awscc.ec2.instances (
  ImageId,
  InstanceType,
  SubnetId,
  UserData,
  Tags,
  region
)
SELECT
  '{{image_id}}',
  '{{instance_type}}',
  '{{subnet_id}}',
  '{{user_data}}',
  '{{tags}}',
  '{{region}}'
RETURNING
  ErrorCode,
  EventTime,
  Identifier,
  Operation,
  OperationStatus,
  RequestToken,
  ResourceModel,
  RetryAfter,
  StatusMessage,
  TypeName;
```

## Variation: with security groups and a key pair

Add networking and access properties as further columns; every AWS::EC2::Instance
property is settable this way, including BlockDeviceMappings, IamInstanceProfile,
MetadataOptions, EbsOptimized, Monitoring and DisableApiTermination:

```sql
INSERT INTO awscc.ec2.instances (
  ImageId,
  InstanceType,
  SubnetId,
  SecurityGroupIds,
  KeyName,
  UserData,
  Tags,
  region
)
SELECT
  '{{image_id}}',
  '{{instance_type}}',
  '{{subnet_id}}',
  '["sg-0123456789abcdef0"]',
  'my-key-pair',
  '{{user_data}}',
  '{{tags}}',
  '{{region}}'
RETURNING
  Identifier,
  OperationStatus,
  RequestToken,
  StatusMessage;
```

## Variation: the native provider

The native provider wraps RunInstances directly and is synchronous - it
returns the instance record rather than a progress event, so no polling is
needed. MinCount and MaxCount are required, and the tag property is
TagSpecification with a ResourceType wrapper:

```sql
INSERT INTO aws.ec2.instances (
  ImageId,
  InstanceType,
  SubnetId,
  UserData,
  TagSpecification,
  MinCount,
  MaxCount,
  region
)
SELECT
  '{{image_id}}',
  '{{instance_type}}',
  '{{subnet_id}}',
  '{{user_data}}',
  '[{"ResourceType":"instance","Tags":[{"Key":"Name","Value":"my-instance"}]}]',
  1,
  1,
  '{{region}}'
RETURNING
  InstanceId,
  InstanceType,
  PrivateIpAddress,
  State,
  SubnetId,
  VpcId;
```

## Notes

UserData must be base64 encoded before it reaches the query - AWS does not
encode it for you, and a plain-text script is accepted silently but never
runs. The AMI architecture must match the instance type: t4g and other
Graviton types need an arm64 AMI, t3 and m5 need x86_64, and a mismatch
fails the launch - confirm a type's architecture with
aws/ec2/instance-types-lookup before launching. Cloud Control assigns Identifier eagerly for some resource
types and lazily for others: when the returned Identifier is non-null it is
the instance id, and when it is null the id only becomes available once the
request reaches SUCCESS, so poll
aws/cloud_control/resource-request-by-token with the RequestToken and read
Identifier from the terminal progress event. On the native provider the
input properties are singular where the AWS API is plural -
TagSpecification, SecurityGroupId, BlockDeviceMapping, NetworkInterface -
which is a common source of unknown-column errors. Terminate with DELETE
FROM awscc.ec2.instances WHERE region = '<region>' AND Identifier =
'<instance_id>', which is likewise asynchronous.
