---
title: Cloudflare API token creation and scope management
description: Looks up permission group ids by name and mints or rescopes an account API token from them; builds least-privilege tokens without hardcoding UUIDs.
verb: select
status: stable
providers: [cloudflare]
services: [accounts]
tags: [cloudflare, accounts, security, identity, tokens]
keywords: [api token, permission groups, least privilege, token scopes, rotate token]
intent_keywords:
  - create a cloudflare api token
  - what permission groups are available
  - change the scopes on an api token
auth: [CLOUDFLARE_API_TOKEN]
params:
  - name: account_id
    type: string
    required: true
    description: Cloudflare account id
    example: 4132d7d5587ee99b9d482ecfc2c1853c
outputs:
  - name: id
    type: string
    description: Permission group id, referenced by policies when creating a token
  - name: name
    type: string
    description: Permission group name, e.g. Zone Read
  - name: scopes
    type: string
    description: JSON array of scope URNs the group applies to
cost:
  fan_out: account
  expensive: false
related:
  - cloudflare/zones/zones-list
  - cloudflare/kv/kv-lifecycle
author: Jeffrey Aven
author_company: StackQL Studios
last_verified: "2026-07-30"
---

Looks up Cloudflare permission groups by name so that a token can be built
from them. Permission groups are identified by UUID in the API but only
meaningful by name, so resolving names to ids is the first step in creating
any least-privilege token - and doing it in SQL means the ids are never
hardcoded.

## Query

```sql
SELECT id, name, scopes
FROM cloudflare.accounts.permission_groups
WHERE account_id = '{{account_id}}'
  AND name IN (
    'Workers KV Storage Write',
    'Account Settings Read',
    'Workers Scripts Read',
    'Pages Read',
    'Account Analytics Read',
    'Analytics Read',
    'Zone WAF Write',
    'Zone Read'
  )
ORDER BY name;
```

## Creating a token from those groups

The insert selects straight from the catalogue, aggregating the matched ids
into the policy document with json_group_array - so the token is defined by
the names you want, not by UUIDs copied from a console:

```sql
INSERT INTO cloudflare.accounts.tokens (
  account_id,
  name,
  policies
)
SELECT
  '{{account_id}}',
  'my-token-name',
  json_array(
    json_object(
      'effect', 'allow',
      'permission_groups', json_group_array(json_object('id', id)),
      'resources', json_object(
        'com.cloudflare.api.account.{{account_id}}',
        json_object('com.cloudflare.api.account.zone.*', '*')
      )
    )
  )
FROM cloudflare.accounts.permission_groups
WHERE account_id = '{{account_id}}'
  AND name IN (
    'Workers KV Storage Write',
    'Account Settings Read',
    'Workers Scripts Read',
    'Pages Read',
    'Account Analytics Read',
    'Analytics Read',
    'Zone WAF Write',
    'Zone Read'
  )
RETURNING result;
```

## Changing the scopes on an existing token

Build the new policy document with the full desired set of names - existing
ones plus the additions - then replace the token definition. The token id and
its secret are unchanged by this:

```sql
REPLACE cloudflare.accounts.tokens
SET name = 'my-token-name',
    policies = '<json document from the query above>'
WHERE account_id = '{{account_id}}'
AND token_id = 'f0a1975b612da0eb8b17f4bef13e09dc'
RETURNING result;
```

## Reading a token

There is no list method - a token is read by id:

```sql
SELECT id, name, status, issued_on, last_used_on
FROM cloudflare.accounts.tokens
WHERE account_id = '{{account_id}}'
AND token_id = 'f0a1975b612da0eb8b17f4bef13e09dc';
```

## Notes

The secret is returned exactly once, as the value field inside the create
response, and can never be read back afterwards - capture it at creation or
rotate the token with EXEC cloudflare.accounts.tokens.roll_token, which
issues a new secret while keeping the same token id. Never persist that value
into a query, a log or a repository. The scope replacement is a full replace:
policies omitted from the document are removed, which is why the rescope
query lists every group the token should end up with rather than only the new
one. resources maps a scope URN to the objects it covers - the account URN
with com.cloudflare.api.account.zone.* grants across all zones in the
account, so narrow it to specific zone URNs for a tighter token. Reading a
token that does not exist returns HTTP 404 with code 1003 'token not found'.
The permission_groups lookup was verified live; the create and replace
statements are reproduced from a verified run rather than executed during
authoring, since running them mints or alters real credentials.
