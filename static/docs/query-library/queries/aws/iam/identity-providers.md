---
title: IAM federated identity providers
description: Inventories the SAML and OIDC identity providers registered in the account; the trusted federation surface behind assumable roles.
verb: select
status: stable
providers: [aws]
services: [iam]
tags: [aws, iam, security, identity, federation, inventory]
keywords: [identity provider, saml, oidc, federation, sso, workload identity]
intent_keywords:
  - list federated identity providers
  - what identity providers are trusted
  - saml and oidc providers in aws
auth: [AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]
permissions: ["iam:ListOpenIDConnectProviders", "iam:ListSAMLProviders"]
params: []
outputs:
  - name: arn
    type: string
    description: Provider ARN; the last path segment is the issuer for OIDC or the provider name for SAML
  - name: provider_type
    type: string
    description: oidc or saml
cost:
  fan_out: none
  expensive: false
related:
  - aws/iam/roles-external-trust
last_verified: "2026-07-29"
---

Inventories every federated identity provider registered in the account, both
OIDC and SAML, in one query. Each provider is a trusted external issuer whose
identities can assume roles, so this is the counterpart to the role trust
review: an unrecognised provider means unrecognised principals can obtain
credentials.

## Query

```sql
SELECT arn, 'oidc' as provider_type
FROM aws.iam.open_id_connect_providers
WHERE region = 'us-east-1'
UNION ALL
SELECT arn, 'saml' as provider_type
FROM aws.iam.saml_providers
WHERE region = 'us-east-1';
```

## Notes

OIDC providers are typically CI/CD and workload federation (an ARN ending in
token.actions.githubusercontent.com is GitHub Actions); SAML providers are
typically workforce SSO. Which roles each provider can reach comes from the
role trust policies - see aws/iam/roles-external-trust, whose
trusts_oidc_federation and trusts_saml_federation flags mark the roles
involved. Note that roles assumed through AWS IAM Identity Center (SSO) do
not appear here: Identity Center manages its own provider and provisions
roles with a path of /aws-reserved/. An empty result means no federation is
configured and all access is via IAM principals. IAM is global, so region =
'us-east-1' is endpoint routing.
