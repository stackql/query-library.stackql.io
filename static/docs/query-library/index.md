# StackQL Query Library

> Curated, parameterized StackQL queries for common cloud inventory,
> security and operations asks. Each entry has a rendered doc page (HTML),
> a raw Markdown source (`<id>.md`) and a structured JSON document
> (`<id>.json`) consumed by the stackql MCP server's `query_library_search`
> and `query_library_get` tools.

Build `ql-12708c8552907f46` | 21 entries | machine catalogue:
[index.json](https://stackql.io/docs/query-library/index.json) |
[manifest.json](https://stackql.io/docs/query-library/manifest.json)

## aws

- [Cloud Control resource request by token](https://stackql.io/docs/query-library/queries/aws/cloud_control/resource-request-by-token) (select; draft; params: region, request_token): Gets the progress event for one Cloud Control resource request by its request token; poll it until the operation completes.
- [Cloud Control resource requests by status](https://stackql.io/docs/query-library/queries/aws/cloud_control/resource-requests-by-status) (select; params: region, operation, operation_status): Lists recent Cloud Control resource requests in a region filtered by operation and status; the follow-up surface for asynchronous AWS mutations.
- [Stop an EC2 instance](https://stackql.io/docs/query-library/queries/aws/ec2/instance-stop) (lifecycle; draft; params: region, instance_id): Stops one EC2 instance by instance id via the native stop lifecycle operation.
- [EC2 instances in a region](https://stackql.io/docs/query-library/queries/aws/ec2/instances-by-region) (select; draft; params: region): Lists EC2 instances in one region with type, state, addressing and network placement.
- [Enabled AWS regions](https://stackql.io/docs/query-library/queries/aws/ec2/regions-enabled) (select): Lists AWS regions with their opt-in status; exclude not-opted-in regions from sweeps.
- [IAM users enumeration](https://stackql.io/docs/query-library/queries/aws/iam/users-list) (select; draft): Enumerates IAM user names in the account; IAM is global, the region only routes the call.
- [Lambda functions in a region](https://stackql.io/docs/query-library/queries/aws/lambda/functions-list) (select; draft; params: region): Enumerates Lambda function names in one region via the list-only resource.
- [Set CloudWatch log group retention](https://stackql.io/docs/query-library/queries/aws/logs/log-group-retention-update) (mutation; draft; params: region, log_group_name, retention_days): Updates RetentionInDays on a CloudWatch log group via an asynchronous Cloud Control update.
- [S3 bucket security detail](https://stackql.io/docs/query-library/queries/aws/s3/bucket-detail) (select; params: region, bucket_name): Full security attributes for one bucket: public access block, encryption, versioning, ownership.
- [S3 buckets cheap enumeration](https://stackql.io/docs/query-library/queries/aws/s3/buckets-list) (select; params: region): Enumerates S3 bucket names and regions via the list-only resource; identifiers only, no detail.
- [Find AWS resource identifiers by tag](https://stackql.io/docs/query-library/queries/aws/tagging/resources-by-tag) (select; params: region, resource_type, tag_key, tag_value): Resolves identifiers for ID-centric AWS resource types by querying the tagging API with a resource type and tag filter; returns ARNs, extracted ids and tags.

## azure

- [Azure VMs in a subscription](https://stackql.io/docs/query-library/queries/azure/compute/vms-by-subscription) (select; draft; params: subscription_id): Lists all virtual machines across a subscription with name, location and tags.
- [Azure storage accounts security posture](https://stackql.io/docs/query-library/queries/azure/storage/storage-accounts-security) (select; draft; params: subscription_id): Lists storage accounts in a subscription with public access, TLS and HTTPS-only settings flattened.
- [Azure subscriptions](https://stackql.io/docs/query-library/queries/azure/subscription/subscriptions-list) (select): Lists subscriptions visible to the credential, tenant-wide; audit only Enabled subscriptions.

## cloudflare

- [Cloudflare zones](https://stackql.io/docs/query-library/queries/cloudflare/zones/zones-list) (select; draft): Lists all Cloudflare zones visible to the token with status and pause state.

## databricks

- [Databricks workspaces in an account](https://stackql.io/docs/query-library/queries/databricks/provisioning/workspaces-list) (select; draft; params: account_id): Lists all Databricks workspaces in an account with cloud, region and provisioning status.

## github

- [GitHub repositories in an organization](https://stackql.io/docs/query-library/queries/github/repos/org-repos-list) (select; params: org): Lists all repositories in a GitHub organization with visibility, archive state and activity signals.

## google

- [GCP projects under an org or folder](https://stackql.io/docs/query-library/queries/google/cloudresourcemanager/projects-by-parent) (select; params: parent): Lists projects under a parent organization or folder; audit only ACTIVE projects.
- [GCE instances in a zone](https://stackql.io/docs/query-library/queries/google/compute/instances-by-zone) (select; draft; params: project, zone): Lists Compute Engine instances in one project and zone with status, machine type and creation time.
- [GCP service accounts in a project](https://stackql.io/docs/query-library/queries/google/iam/service-accounts-by-project) (select; draft; params: project): Lists IAM service accounts in one project with email, display name and disabled state.
- [GCS buckets in a project](https://stackql.io/docs/query-library/queries/google/storage/buckets-by-project) (select; draft; params: project): Lists Cloud Storage buckets in one project with location, storage class and creation time.
