---
title: IAM roles trusting external accounts
description: Lists IAM roles whose trust policy admits principals from other AWS accounts, flagging external id and federation use; the cross-account exposure surface.
verb: select
status: stable
providers: [aws]
services: [iam]
tags: [aws, iam, security, cspm, identity, trust]
keywords: [cross account trust, assume role policy, external principal, confused deputy]
intent_keywords:
  - which roles can be assumed by other accounts
  - find cross account trust relationships
  - external principals in role trust policies
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["iam:ListRoles"]
params:
  - name: account_id
    type: string
    required: true
    pattern: "^[0-9]{12}$"
    description: This account's 12-digit id; principals from any other account are treated as external
    example: "123456789012"
outputs:
  - name: role_name
    type: string
    description: Role name
  - name: create_date
    type: string
    description: Role creation date
  - name: requires_external_id
    type: string
    description: true when the trust policy conditions on sts:ExternalId
  - name: trusts_oidc_federation
    type: string
    description: true when the trust policy admits an OIDC identity provider
  - name: trusts_saml_federation
    type: string
    description: true when the trust policy admits a SAML identity provider
  - name: assume_role_policy_document
    type: string
    description: URL-encoded trust policy; decode to read the exact principals
cost:
  fan_out: none
  expensive: false
related:
  - aws/iam/identity-providers
  - aws/iam/users-list
last_verified: "2026-07-29"
---

Lists the IAM roles whose trust policy names a principal in an AWS account
other than this one. Cross-account trust is the main lateral-movement surface
in an account: each result is a role a third party can assume, so review the
principal and confirm it is an intended partner, vendor or sibling account.
Roles trusting only AWS services or principals within this account are
excluded.

## Query

```sql
SELECT
role_name,
create_date,
CASE WHEN instr(assume_role_policy_document, 'sts%3AExternalId') > 0 THEN 'true' ELSE 'false' END as requires_external_id,
CASE WHEN instr(assume_role_policy_document, 'oidc-provider') > 0 THEN 'true' ELSE 'false' END as trusts_oidc_federation,
CASE WHEN instr(assume_role_policy_document, 'saml-provider') > 0 THEN 'true' ELSE 'false' END as trusts_saml_federation,
assume_role_policy_document
FROM aws.iam.roles
WHERE region = 'us-east-1'
AND instr(REPLACE(assume_role_policy_document, 'iam%3A%3A{{account_id}}', ''), 'iam%3A%3A') > 0;
```

## Notes

assume_role_policy_document is URL-encoded, so the matching works on encoded
text: iam%3A%3A is iam::, and the REPLACE strips this account's own ARNs
before looking for any remaining account reference. Decode the document to
read exact principals. A cross-account role without requires_external_id is
the confused-deputy exposure worth prioritising, particularly for vendor
integrations - third-party access should always be conditioned on an
external id. Roles trusting federation (trusts_oidc_federation or
trusts_saml_federation true) admit workloads or workforce identities from a
registered identity provider rather than an account principal; inventory
those providers with aws/iam/identity-providers. IAM is global, so region =
'us-east-1' is endpoint routing.
