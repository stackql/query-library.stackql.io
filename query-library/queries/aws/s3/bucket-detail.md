---
title: S3 bucket security detail
description: "Full security configuration for one bucket: public access block, encryption, versioning, ownership controls and logging."
verb: select
status: stable
providers: [awscc]
services: [s3]
tags: [aws, s3, storage, security]
keywords: [bucket encryption, public access block, bucket versioning, object ownership]
intent_keywords:
  - is my bucket public
  - bucket security settings
  - s3 bucket detail
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["s3:GetBucketPublicAccessBlock", "s3:GetEncryptionConfiguration", "s3:GetBucketVersioning", "s3:GetBucketOwnershipControls", "s3:GetBucketLogging"]
params:
  - name: region
    type: identifier
    required: true
    description: Region the bucket lives in; take it from the enumeration query
    example: us-east-1
  - name: bucket_name
    type: string
    required: true
    description: Bucket name (the Identifier key)
    example: my-bucket
outputs:
  - name: bucket_name
    type: string
    description: Bucket name
  - name: public_access_block_configuration
    type: string
    description: Block-public-access settings as JSON; all four keys should be true
  - name: bucket_encryption
    type: string
    description: Default encryption configuration as JSON
  - name: versioning_configuration
    type: string
    description: Versioning state as JSON; null when versioning was never enabled
  - name: ownership_controls
    type: string
    description: Object ownership rules; BucketOwnerEnforced disables ACLs entirely
  - name: logging_configuration
    type: string
    description: Server access logging target, null when logging is off
  - name: object_lock_enabled
    type: string
    description: Whether object lock is enabled
  - name: tags
    type: string
    description: Bucket tags
cost:
  fan_out: none
  expensive: true
  notes: One request per bucket when iterated over an inventory
related:
  - aws/s3/buckets-list
  - aws/s3/public-access-audit
last_verified: "2026-07-29"
---

Returns the full security configuration of a single S3 bucket: block public
access, default encryption, versioning, object ownership and logging. Use it
to answer "is this bucket configured safely" for one bucket, or iterate it
over aws/s3/buckets-list for an account-wide audit.

## Query

```sql
SELECT
bucket_name,
public_access_block_configuration,
bucket_encryption,
versioning_configuration,
ownership_controls,
logging_configuration,
object_lock_enabled,
tags
FROM awscc.s3.buckets
WHERE region = '{{region}}'
AND Identifier = '{{bucket_name}}';
```

## Variation: flatten the JSON attributes

Extract the individual settings rather than returning whole documents:

```sql
SELECT
bucket_name,
json_extract(public_access_block_configuration, '$.BlockPublicAcls') as block_public_acls,
json_extract(public_access_block_configuration, '$.BlockPublicPolicy') as block_public_policy,
json_extract(bucket_encryption, '$.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm') as encryption_algorithm,
json_extract(ownership_controls, '$.Rules[0].ObjectOwnership') as object_ownership
FROM awscc.s3.buckets
WHERE region = '{{region}}'
AND Identifier = '{{bucket_name}}';
```

## Notes

This is a keyed Cloud Control read - one request per bucket - and the region
must be the bucket's own region, which aws/s3/buckets-list returns as
bucket_region. The equivalent native per-aspect resources
(aws.s3.public_access_blocks and friends) currently return empty rather than
the configuration, so the Cloud Control resource is the reliable path.
Boolean values inside the JSON documents come back as 1 and 0 through
json_extract, not true and false. A null versioning_configuration means
versioning was never enabled, which is materially different from Suspended.
ownership_controls of BucketOwnerEnforced disables ACLs entirely, making ACL
based public exposure impossible regardless of the block settings. Computed
CASE expressions cannot be aliased in a projection over awscc resources -
the query fails with a cannot find col error - so return the raw values and
interpret them client-side.
