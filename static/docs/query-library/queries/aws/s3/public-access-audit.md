---
title: S3 bucket public access block audit
description: Reports the four block-public-access settings plus object ownership for a bucket; any flag returning 0 leaves a public exposure path open.
verb: select
status: stable
providers: [awscc]
services: [s3]
tags: [aws, s3, security, cspm, storage]
keywords: [public bucket, block public access, public acl, bucket policy status, exposure]
intent_keywords:
  - which s3 buckets are public
  - find buckets with public access block disabled
  - s3 buckets with public acls or policies
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["s3:GetBucketPublicAccessBlock", "s3:GetBucketOwnershipControls"]
params:
  - name: region
    type: identifier
    required: true
    description: The bucket's own region, from the enumeration query
    example: us-east-1
  - name: bucket_name
    type: string
    required: true
    description: Bucket to audit; iterate the account's buckets for a full sweep
    example: my-bucket
outputs:
  - name: bucket_name
    type: string
    description: Bucket name
  - name: block_public_acls
    type: number
    description: 1 when new public ACLs are rejected, 0 when they are allowed
  - name: ignore_public_acls
    type: number
    description: 1 when existing public ACLs are ignored, 0 when they still grant access
  - name: block_public_policy
    type: number
    description: 1 when public bucket policies are rejected, 0 when they are allowed
  - name: restrict_public_buckets
    type: number
    description: 1 when public policy access is restricted to authorised principals
  - name: object_ownership
    type: string
    description: BucketOwnerEnforced disables ACLs entirely; ObjectWriter and BucketOwnerPreferred leave them active
cost:
  fan_out: account
  expensive: true
  notes: One request per bucket when swept across an account
related:
  - aws/s3/buckets-list
  - aws/s3/bucket-detail
last_verified: "2026-07-29"
---

Reports the four block-public-access settings for a bucket alongside its
object ownership rule. All four flags returning 1 means the bucket cannot be
made public by ACL or policy. Any flag returning 0 leaves a corresponding
exposure path open and is the finding to report. Enumerate buckets with
aws/s3/buckets-list and iterate this query over them for an account sweep.

## Query

```sql
SELECT
bucket_name,
json_extract(public_access_block_configuration, '$.BlockPublicAcls') as block_public_acls,
json_extract(public_access_block_configuration, '$.IgnorePublicAcls') as ignore_public_acls,
json_extract(public_access_block_configuration, '$.BlockPublicPolicy') as block_public_policy,
json_extract(public_access_block_configuration, '$.RestrictPublicBuckets') as restrict_public_buckets,
json_extract(ownership_controls, '$.Rules[0].ObjectOwnership') as object_ownership
FROM awscc.s3.buckets
WHERE region = '{{region}}'
AND Identifier = '{{bucket_name}}';
```

## Reading the result

A bucket returning 1 for all four flags is compliant. The flags map to
distinct exposure paths, so a 0 in any one of them is actionable:
BlockPublicAcls 0 allows new public ACLs to be set, IgnorePublicAcls 0 means
existing public ACLs still grant access, BlockPublicPolicy 0 allows a public
bucket policy to be attached, and RestrictPublicBuckets 0 means an existing
public policy grants access to anyone rather than only authorised
principals. An object_ownership of BucketOwnerEnforced removes ACLs from the
picture entirely, so ACL-related findings on such a bucket are theoretical
rather than exploitable.

## Notes

Values arrive as 1 and 0 rather than true and false because json_extract
maps JSON booleans to integers. A null public_access_block_configuration
means no block configuration exists at all, which is the worst case - every
path is open - and is distinct from a configuration with all flags set to 0.
The native aws.s3.public_access_blocks resource returns empty rather than
the configuration, so this Cloud Control read is the reliable source. The
region must be the bucket's own region, available as bucket_region from
aws/s3/buckets-list. This checks the account-level and bucket-level block
configuration, not whether a public policy or ACL is actually attached: a
bucket with blocks disabled is not necessarily public, only capable of
becoming so, so confirm with the bucket policy before reporting a bucket as
publicly readable. Computed CASE expressions cannot be aliased in a
projection over awscc resources, so verdict logic belongs client-side.
