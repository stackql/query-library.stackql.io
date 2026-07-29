---
title: IAM users with console access and no MFA
description: Lists IAM users alongside whether they have a virtual MFA device registered; console-capable users without MFA are the finding.
verb: select
status: stable
providers: [aws]
services: [iam]
tags: [aws, iam, security, cspm, mfa, identity]
keywords: [mfa, console access, unprotected users, multi factor]
intent_keywords:
  - which iam users have no mfa
  - find users without multi factor authentication
  - console users missing mfa
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["iam:ListUsers", "iam:ListVirtualMFADevices"]
params: []
outputs:
  - name: user_name
    type: string
    description: IAM user name
  - name: password_last_used
    type: string
    description: Last console sign-in; the string null when the user has never signed in
  - name: create_date
    type: string
    description: User creation date
  - name: has_virtual_mfa
    type: string
    description: true when a virtual MFA device is registered to the user
cost:
  fan_out: none
  expensive: false
related:
  - aws/iam/users-list
  - aws/iam/password-policy-cis
last_verified: "2026-07-29"
---

Lists every IAM user with a flag for whether a virtual MFA device is
registered to them. Users with has_virtual_mfa = false that also show a
password_last_used timestamp have used console access without MFA - the
priority finding. IAM is global, so this is one query per account.

## Query

```sql
SELECT
u.user_name,
u.password_last_used,
u.create_date,
CASE WHEN v.serial_number IS NULL THEN 'false' ELSE 'true' END as has_virtual_mfa
FROM aws.iam.users u
LEFT JOIN aws.iam.virtual_mfa_devices v
ON json_extract(v.user, '$.UserName') = u.user_name
WHERE u.region = 'us-east-1' AND v.region = 'us-east-1';
```

## Notes

Both sides of the join need their own region predicate; omitting the one on
the joined table fails with an AWS region is nil error rather than returning
rows. password_last_used is the string null for users who have never signed
in to the console - those users may be programmatic-only, so treat a null
alongside has_virtual_mfa = false as lower severity than a recent sign-in
with no MFA. This covers virtual MFA devices only: hardware MFA and
passkeys are registered separately and a user relying on those shows as
false here, so confirm a finding before reporting it. Determining console
capability precisely requires the login profile per user (one call each);
password_last_used is the cheap account-wide proxy used here.
