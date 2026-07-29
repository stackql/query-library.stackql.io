---
title: S3 buckets cheap enumeration
description: Enumerates every S3 bucket in the account with its ARN, home region and creation date in one account-global call.
verb: select
status: stable
providers: [aws]
services: [s3]
tags: [aws, s3, storage, inventory]
keywords: [bucket list, s3 inventory, list buckets, bucket region]
intent_keywords:
  - list all s3 buckets
  - bucket inventory
  - enumerate buckets
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["s3:ListAllMyBuckets"]
params:
  - name: region
    type: identifier
    required: false
    default: us-east-1
    description: Routing region; bucket listing is account-global
    example: us-east-1
outputs:
  - name: name
    type: string
    description: Bucket name
  - name: bucket_region
    type: string
    description: Region the bucket lives in
  - name: bucket_arn
    type: string
    description: Bucket ARN
  - name: creation_date
    type: string
    description: Creation timestamp
cost:
  fan_out: none
  expensive: false
  notes: Single account-global list call
related:
  - aws/s3/bucket-detail
  - aws/s3/public-access-audit
author: Jeffrey Aven
author_company: StackQL Studios
last_verified: "2026-07-29"
---

Enumerates every S3 bucket in the account in a single call. Bucket listing is
account-global, so the region only routes the request - the bucket's own
region comes back in bucket_region. This is the cheap inventory path and the
enumeration step before any per-bucket configuration read.

## Query

```sql
SELECT name, bucket_region, bucket_arn, creation_date
FROM aws.s3.buckets
WHERE region = '{{region}}'
AND "max-buckets" = 1000;
```

## Variation: buckets matching a name prefix

```sql
SELECT name, bucket_region, creation_date
FROM aws.s3.buckets
WHERE region = '{{region}}'
AND prefix = 'my-app-';
```

## Notes

The "max-buckets" predicate is load-bearing and not just a page size: AWS
only populates BucketRegion when the list request carries at least one
optional query parameter, so without it every bucket returns a null region
while still listing correctly. Quote the column name - the hyphen makes it
an invalid bare identifier. 1000 is the API maximum; supplying prefix
instead has the same region-populating effect. There is no
aws.s3.buckets_list_only resource - the awscc provider exposes
awscc.s3.buckets_list_only, but this native call already returns names,
ARNs, regions and creation dates in one request, so it is the better
enumeration. Pair with aws/s3/bucket-detail for per-bucket configuration,
one request per bucket.
