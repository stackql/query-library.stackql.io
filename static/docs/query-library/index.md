# StackQL Query Library

> Curated, parameterized StackQL queries for common cloud inventory,
> security and operations asks. Each entry has a rendered doc page (HTML),
> a raw Markdown source (`<id>.md`) and a structured JSON document
> (`<id>.json`) consumed by the stackql MCP server's `query_library_search`
> and `query_library_get` tools.

Build `ql-ea4d2cbf5ec44568` | 47 entries | machine catalogue:
[index.json](https://stackql.io/docs/query-library/index.json) |
[manifest.json](https://stackql.io/docs/query-library/manifest.json)

## aws

- [Cloud Control resource request by token](https://stackql.io/docs/query-library/queries/aws/cloud_control/resource-request-by-token) (select; draft; params: region, request_token): Gets the progress event for one Cloud Control resource request by its request token; poll it until the operation completes.
- [Cloud Control resource requests by status](https://stackql.io/docs/query-library/queries/aws/cloud_control/resource-requests-by-status) (select; params: region, operation, operation_status): Lists recent Cloud Control resource requests in a region filtered by operation and status; the follow-up surface for asynchronous AWS mutations.
- [Launch an EC2 instance](https://stackql.io/docs/query-library/queries/aws/ec2/instance-create) (mutation; draft; params: region, image_id, instance_type, subnet_id, user_data, tags): Launches an EC2 instance through Cloud Control, returning a progress event to poll; user data must be base64 encoded.
- [EC2 instance state and lifecycle control](https://stackql.io/docs/query-library/queries/aws/ec2/instance-state-management) (select; params: region): Reports instance state and health checks for a region, and covers the stop and start lifecycle operations that change it.
- [EC2 instance type specifications](https://stackql.io/docs/query-library/queries/aws/ec2/instance-types-lookup) (select; params: region, instance_type): Looks up vCPU, memory, architecture and capability details for named EC2 instance types; the architecture check before launching an instance.
- [EC2 instances in a region](https://stackql.io/docs/query-library/queries/aws/ec2/instances-by-region) (select; params: region): Lists EC2 instances in one region with type, state, addressing and network placement.
- [Enabled AWS regions](https://stackql.io/docs/query-library/queries/aws/ec2/regions-enabled) (select): Lists the AWS regions enabled for the account with endpoint, country and opt-in status; the valid fan-out list for region-swept queries.
- [IAM access key age and rotation status](https://stackql.io/docs/query-library/queries/aws/iam/access-keys-age) (select; params: user_name): Lists a user's access keys with their age in days; keys older than the rotation window are the finding.
- [IAM federated identity providers](https://stackql.io/docs/query-library/queries/aws/iam/identity-providers) (select): Inventories the SAML and OIDC identity providers registered in the account; the trusted federation surface behind assumable roles.
- [IAM account password policy vs CIS benchmark](https://stackql.io/docs/query-library/queries/aws/iam/password-policy-cis) (select): Assesses the IAM account password policy against CIS AWS Foundations Benchmark password controls, returning raw values and per-control PASS/FAIL verdicts.
- [IAM roles trusting external accounts](https://stackql.io/docs/query-library/queries/aws/iam/roles-external-trust) (select; params: account_id): Lists IAM roles whose trust policy admits principals from other AWS accounts, flagging external id and federation use; the cross-account exposure surface.
- [IAM users with console access and no MFA](https://stackql.io/docs/query-library/queries/aws/iam/users-console-no-mfa) (select): Lists IAM users alongside whether they have a virtual MFA device registered; console-capable users without MFA are the finding.
- [IAM users enumeration](https://stackql.io/docs/query-library/queries/aws/iam/users-list) (select): Enumerates IAM users in the account; IAM is global and always served from us-east-1, so the query takes no parameters.
- [Lambda fleet analytics by runtime and architecture](https://stackql.io/docs/query-library/queries/aws/lambda/function-analytics) (select; params: region): Summarises a region's Lambda functions by runtime and architecture with counts and memory totals; the runtime modernisation and Graviton migration view.
- [Lambda functions in a region](https://stackql.io/docs/query-library/queries/aws/lambda/functions-list) (select; params: region): Lists Lambda functions in one region with runtime, architecture, memory, timeout and execution role in a single call.
- [Lambda functions with public resource policies](https://stackql.io/docs/query-library/queries/aws/lambda/public-access-policies) (select; draft; params: region, function_name): Reads a Lambda function's resource policy and flags statements granting invoke rights to a wildcard principal; the public-invoke exposure check.
- [Set CloudWatch log group retention](https://stackql.io/docs/query-library/queries/aws/logs/log-group-retention-update) (mutation; draft; params: region, log_group_name, retention_days): Updates RetentionInDays on a CloudWatch log group via an asynchronous Cloud Control update.
- [S3 bucket security detail](https://stackql.io/docs/query-library/queries/aws/s3/bucket-detail) (select; params: region, bucket_name): Full security configuration for one bucket: public access block, encryption, versioning, ownership controls and logging.
- [S3 buckets cheap enumeration](https://stackql.io/docs/query-library/queries/aws/s3/buckets-list) (select): Enumerates every S3 bucket in the account with its ARN, home region and creation date in one account-global call.
- [S3 bucket public access block audit](https://stackql.io/docs/query-library/queries/aws/s3/public-access-audit) (select; params: region, bucket_name): Reports the four block-public-access settings plus object ownership for a bucket; any flag returning 0 leaves a public exposure path open.
- [Find AWS resource identifiers by tag](https://stackql.io/docs/query-library/queries/aws/tagging/resources-by-tag) (select; params: region, resource_type, tag_key, tag_value): Resolves identifiers for ID-centric AWS resource types by querying the tagging API with a resource type and tag filter; returns ARNs, extracted ids and tags.

## azure

- [Azure VM custom script extension](https://stackql.io/docs/query-library/queries/azure/compute/vm-custom-script-extension) (select; draft; params: subscription_id, resource_group_name, vm_name): Runs a shell command on an existing VM via the CustomScript extension, and lists the extensions installed on a VM; the way to load content onto a server after provisioning.
- [Azure VMs in a subscription](https://stackql.io/docs/query-library/queries/azure/compute/vms-by-subscription) (select; params: subscription_id): Lists virtual machines across a subscription with name, location, provisioning state and the profiles describing size, image and networking.
- [Azure Cosmos DB table lifecycle](https://stackql.io/docs/query-library/queries/azure/cosmosdb/table-lifecycle) (select; params: subscription_id, resource_group_name, account_name): Provisions a serverless Cosmos DB account with the Table API, creates and lists tables, and tears them down; the control-plane half of a Table workload.
- [Azure public IP address provisioning](https://stackql.io/docs/query-library/queries/azure/network/public-ip-provision) (select; params: subscription_id, resource_group_name): Lists public IP addresses in a resource group, and creates or deletes a static Standard SKU address for attaching to a NIC or load balancer.
- [Azure virtual network and subnet provisioning](https://stackql.io/docs/query-library/queries/azure/network/vnet-subnet-provision) (select; params: subscription_id, resource_group_name): Creates a virtual network and subnet, and lists them with their address ranges; the network substrate VMs and private endpoints attach to.
- [Azure resource group lifecycle](https://stackql.io/docs/query-library/queries/azure/resource/resource-groups-lifecycle) (select; params: subscription_id): Lists resource groups in a subscription, and creates or deletes one; the container every other Azure resource lives in.
- [Azure storage account and blob container provisioning](https://stackql.io/docs/query-library/queries/azure/storage/storage-account-provision) (select; params: subscription_id): Lists storage accounts in a subscription, and creates an account with a private blob container; the object storage substrate.
- [Azure subscription detail](https://stackql.io/docs/query-library/queries/azure/subscription/subscriptions-list) (select; draft; params: subscription_id): Reads a subscription's name and state; requires owner-level rights, so most service principals cannot call it.

## cloudflare

- [Cloudflare API token creation and scope management](https://stackql.io/docs/query-library/queries/cloudflare/accounts/api-token-lifecycle) (select; params: account_id): Looks up permission group ids by name and mints or rescopes an account API token from them; builds least-privilege tokens without hardcoding UUIDs.
- [Cloudflare edge IP ranges](https://stackql.io/docs/query-library/queries/cloudflare/ips/edge-ip-ranges) (select): Returns Cloudflare's published IPv4 and IPv6 edge ranges as one CIDR per row; the source list for origin firewall allowlists.
- [Cloudflare KV namespace and value lifecycle](https://stackql.io/docs/query-library/queries/cloudflare/kv/kv-lifecycle) (select; params: account_id, namespace_id): Creates a KV namespace, writes and reads a value, lists keys and deletes both; the full control-plane to data-plane cycle in one surface.
- [Cloudflare rate limit ruleset](https://stackql.io/docs/query-library/queries/cloudflare/rulesets/rate-limit-ruleset) (select; draft; params: zone_id): Reads the rate limiting rules on a zone's http_ratelimit phase, and sets or clears them; the entrypoint ruleset pattern used for edge throttling.
- [Cloudflare HTTP request analytics by country and status](https://stackql.io/docs/query-library/queries/cloudflare/zones/http-analytics) (select; params: zone_tag, since, until): Returns HTTP request volume for a zone grouped by minute, country, method and response status; the GraphQL analytics replacement for the sunset dashboard endpoint.
- [Cloudflare zones](https://stackql.io/docs/query-library/queries/cloudflare/zones/zones-list) (select): Lists all Cloudflare zones visible to the API token with status and pause state; the zone id keys every per-zone API.

## databricks

- [Databricks workspace access assignments](https://stackql.io/docs/query-library/queries/databricks/iam/workspace-assignments) (select; params: account_id, workspace_id): Lists the principals assigned to a Databricks workspace with their permission level, resolving users, groups and service principals into one view.
- [Databricks account credentials and storage configurations](https://stackql.io/docs/query-library/queries/databricks/provisioning/account-infrastructure) (select; params: account_id): Lists the cross-account credentials and root storage configurations registered in a Databricks account; the prerequisites a workspace is built from.
- [Databricks workspaces in an account](https://stackql.io/docs/query-library/queries/databricks/provisioning/workspaces-list) (select; params: account_id): Lists Databricks workspaces via the provider's vw_workspaces view with status, cloud placement and pricing tier; the account-level inventory entry point.

## github

- [GitHub issue creation velocity](https://stackql.io/docs/query-library/queries/github/issues/issue-velocity) (select; draft; params: owner, repo): Sequences a repository's issues by creation date with a cumulative count and the gap since the previous issue; the intake rate and quiet-period view.
- [GitHub weekly commit activity trend](https://stackql.io/docs/query-library/queries/github/repos/commit-activity-trend) (select; params: owner, repo): Reports the last year of weekly commit counts with a four-week moving average and cumulative total; the project momentum view.
- [GitHub contributor ranking and concentration](https://stackql.io/docs/query-library/queries/github/repos/contributor-analytics) (select; params: owner, repo): Ranks a repository's contributors by commit count with running totals and share of the whole; the bus-factor and contribution concentration view.
- [GitHub repositories in an organization](https://stackql.io/docs/query-library/queries/github/repos/org-repos-list) (select; params: org): Lists all repositories in a GitHub organization with visibility, archive state and activity signals, filtered and sorted server-side.
- [GitHub release cadence and gaps](https://stackql.io/docs/query-library/queries/github/repos/release-cadence) (select; params: owner, repo): Lists a repository's releases with the previous and next tag alongside the interval between them; the shipping rhythm and release drought view.

## google

- [GCP projects under an org or folder](https://stackql.io/docs/query-library/queries/google/cloudresourcemanager/projects-by-parent) (select; params: parent): Lists projects directly under a parent organization or folder with state, display name and labels; the fan-out dimension for any org-wide GCP audit.
- [GCE instances in a project](https://stackql.io/docs/query-library/queries/google/compute/instances-by-zone) (select; params: project): Lists Compute Engine instances across every zone in a project in one call, with status, machine type and placement.
- [GCP service accounts in a project](https://stackql.io/docs/query-library/queries/google/iam/service-accounts-by-project) (select; params: project): Lists IAM service accounts in one project with email, display name and unique id; the workload principal inventory for a privilege audit.
- [GCS buckets in a project](https://stackql.io/docs/query-library/queries/google/storage/buckets-by-project) (select; params: project): Lists Cloud Storage buckets in one project with location, storage class and creation time; the per-project storage inventory.
