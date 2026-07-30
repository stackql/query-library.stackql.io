---
title: Azure Cosmos DB table lifecycle
description: Provisions a serverless Cosmos DB account with the Table API, creates and lists tables, and tears them down; the control-plane half of a Table workload.
verb: select
status: stable
providers: [azure]
services: [cosmosdb]
tags: [azure, cosmosdb, table, nosql, lifecycle]
keywords: [cosmos db, table api, serverless cosmos, create table, database account]
intent_keywords:
  - create a cosmos db table
  - list cosmos db tables
  - provision a serverless cosmos account
auth: [AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET]
permissions: [Microsoft.DocumentDB/databaseAccounts/read]
params:
  - name: subscription_id
    type: string
    required: true
    pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    description: Azure subscription id (GUID)
    example: 00000000-0000-0000-0000-000000000000
  - name: resource_group_name
    type: string
    required: true
    description: Resource group containing the Cosmos DB account
    example: my-resource-group
  - name: account_name
    type: string
    required: true
    description: Cosmos DB account name, globally unique and lowercase
    example: mycosmosaccount
outputs:
  - name: name
    type: string
    description: Table name
cost:
  fan_out: none
  expensive: false
  notes: A serverless account bills per request rather than per hour, but the account itself persists until deleted
related:
  - azure/resource/resource-groups-lifecycle
  - azure/storage/storage-account-provision
last_verified: "2026-07-30"
---

Lists the tables in a Cosmos DB account, and covers provisioning a serverless
Table API account and creating and deleting tables in it. This is the control
plane: it manages the account and the table containers themselves, addressed
through Azure Resource Manager with subscription and resource group scoping.

## Query

```sql
SELECT name
FROM azure.cosmosdb.table_resources
WHERE subscription_id = '{{subscription_id}}'
AND resource_group_name = '{{resource_group_name}}'
AND account_name = '{{account_name}}';
```

## Provisioning a serverless Table API account

The capabilities array is what selects the API and the billing model -
EnableTable for the Table API, EnableServerless for per-request billing:

```sql
INSERT INTO azure.cosmosdb.database_accounts(
  account_name,
  resource_group_name,
  subscription_id,
  location,
  kind,
  properties
)
SELECT
  '{{account_name}}',
  '{{resource_group_name}}',
  '{{subscription_id}}',
  'westus2',
  'GlobalDocumentDB',
  '{"databaseAccountOfferType": "Standard", "locations": [{"locationName": "westus2", "failoverPriority": 0}], "capabilities": [{"name": "EnableTable"}, {"name": "EnableServerless"}]}';
```

Poll until the account is usable:

```sql
SELECT name, provisioning_state
FROM azure.cosmosdb.database_accounts
WHERE subscription_id = '{{subscription_id}}'
AND resource_group_name = '{{resource_group_name}}';
```

## Creating a table

```sql
INSERT INTO azure.cosmosdb.table_resources(
  account_name,
  resource_group_name,
  subscription_id,
  table_name,
  properties
)
SELECT
  '{{account_name}}',
  '{{resource_group_name}}',
  '{{subscription_id}}',
  'my-table',
  '{"resource": {"id": "my-table"}, "options": {}}';
```

## Deleting a table

```sql
DELETE FROM azure.cosmosdb.table_resources
WHERE subscription_id = '{{subscription_id}}'
AND resource_group_name = '{{resource_group_name}}'
AND account_name = '{{account_name}}'
AND table_name = 'my-table';
```

## Notes

The table id is given twice on create - once as the table_name parameter that
builds the URL and once inside the resource object in the body - and the two
must agree. Account provisioning is asynchronous and typically takes a minute
or two, so poll provisioning_state rather than creating a table immediately
after the insert returns. On a serverless account the keyed single-table read
(adding table_name to the list query) fails with BadRequest and the message
that reading or replacing offers is not supported for serverless accounts,
because that path also reads the throughput offer; list the tables and filter
client-side instead. Account names are globally unique and lowercase.
Deleting the account or its resource group removes every table with it. Table
row operations are a separate data-plane surface reached through
azure.data_tables against the account's own endpoint rather than through
Resource Manager, and authenticate independently of these control-plane
calls.
