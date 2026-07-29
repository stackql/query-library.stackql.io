---
title: IAM account password policy vs CIS benchmark
description: Assesses the IAM account password policy against CIS AWS Foundations Benchmark password controls, returning raw values and per-control PASS/FAIL verdicts.
verb: select
status: stable
providers: [aws]
services: [iam]
tags: [aws, iam, security, cspm, compliance, cis]
keywords: [password policy, cis benchmark, account security posture, compliance audit]
intent_keywords:
  - check iam password policy against cis
  - is the aws password policy compliant
  - audit account password policy
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["iam:GetAccountPasswordPolicy"]
params: []
outputs:
  - name: minimum_password_length
    type: integer
    description: Configured minimum password length
  - name: password_reuse_prevention
    type: integer
    description: Number of previous passwords remembered, null when not set
  - name: require_uppercase_characters
    type: boolean
    description: Whether an uppercase letter is required
  - name: require_lowercase_characters
    type: boolean
    description: Whether a lowercase letter is required
  - name: require_symbols
    type: boolean
    description: Whether a symbol is required
  - name: require_numbers
    type: boolean
    description: Whether a number is required
  - name: expire_passwords
    type: boolean
    description: Whether passwords expire
  - name: max_password_age
    type: integer
    description: Password expiry in days, null when expiry is off
  - name: allow_users_to_change_password
    type: boolean
    description: Whether users may change their own passwords
  - name: hard_expiry
    type: boolean
    description: Whether expired passwords require admin reset
  - name: cis_minimum_length_14
    type: string
    description: PASS when minimum_password_length >= 14 (CIS 1.8)
  - name: cis_reuse_prevention_24
    type: string
    description: PASS when password_reuse_prevention >= 24 (CIS 1.9)
  - name: cis_require_uppercase
    type: string
    description: PASS when uppercase is required (CIS v1.2.0)
  - name: cis_require_lowercase
    type: string
    description: PASS when lowercase is required (CIS v1.2.0)
  - name: cis_require_symbols
    type: string
    description: PASS when a symbol is required (CIS v1.2.0)
  - name: cis_require_numbers
    type: string
    description: PASS when a number is required (CIS v1.2.0)
  - name: cis_max_age_90
    type: string
    description: PASS when passwords expire within 90 days (CIS v1.2.0)
cost:
  fan_out: none
  expensive: false
related:
  - aws/iam/users-list
last_verified: "2026-07-29"
---

Assesses the account's IAM password policy against the CIS AWS Foundations
Benchmark password controls in a single query: each control returns a
PASS/FAIL verdict with the raw configured values alongside as audit
evidence. IAM is global, so this is one query per account, no fan-out.

## Query

```sql
SELECT
minimum_password_length,
password_reuse_prevention,
require_uppercase_characters,
require_lowercase_characters,
require_symbols,
require_numbers,
expire_passwords,
max_password_age,
allow_users_to_change_password,
hard_expiry,
CASE WHEN minimum_password_length >= 14 THEN 'PASS' ELSE 'FAIL' END as cis_minimum_length_14,
CASE WHEN password_reuse_prevention >= 24 THEN 'PASS' ELSE 'FAIL' END as cis_reuse_prevention_24,
CASE WHEN require_uppercase_characters IN (1, 'true') THEN 'PASS' ELSE 'FAIL' END as cis_require_uppercase,
CASE WHEN require_lowercase_characters IN (1, 'true') THEN 'PASS' ELSE 'FAIL' END as cis_require_lowercase,
CASE WHEN require_symbols IN (1, 'true') THEN 'PASS' ELSE 'FAIL' END as cis_require_symbols,
CASE WHEN require_numbers IN (1, 'true') THEN 'PASS' ELSE 'FAIL' END as cis_require_numbers,
CASE WHEN expire_passwords IN (1, 'true') AND max_password_age <= 90 THEN 'PASS' ELSE 'FAIL' END as cis_max_age_90
FROM aws.iam.account_password_policies
WHERE region = 'us-east-1';
```

## Notes

An empty result means the account has no password policy at all (the API
returns NoSuchEntity): treat every control as failing, and creating a policy
is the first remediation. Current benchmark versions (v1.4.0 through v3.0)
retain two password controls - the 14-character minimum (control 1.8) and
24-password reuse prevention (1.9); the complexity and 90-day expiry checks
come from CIS v1.2.0 and remain common organizational baselines, so failing
them is a finding to report, not necessarily a current-benchmark violation.
A null in password_reuse_prevention or max_password_age means the setting is
not configured and its check correctly fails. IAM is global: region =
'us-east-1' is endpoint routing, never a parameter. Boolean policy fields
are stored as 1/0 on the default SQLite backend; the IN (1, 'true')
predicate keeps the checks robust across backends.
