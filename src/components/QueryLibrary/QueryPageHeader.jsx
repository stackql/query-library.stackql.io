import React from 'react';
import Link from '@docusaurus/Link';
import VerbBadge, {StatusBadge} from './VerbBadge';
import providersSummary from '@site/static/docs/query-library/providers.json';
import providersData from '@site/src/configs/providers-data.json';
import providerFamilies from '@site/src/configs/provider-families.json';
import styles from './styles.module.css';

// Badge label: the actual StackQL provider's display name; the link targets
// the provider *family* page (first id segment), e.g. databricks_account
// entries link to /docs/query-library/databricks.
function providerTitle(id) {
  const row = providersData.find((p) => p.name === id);
  if (row) return row.title;
  const summary = providersSummary.find((p) => p.id === id);
  return summary ? summary.title : id;
}

function familyOf(id) {
  return providerFamilies[id] || id;
}

const FAN_OUT_TEXT = {
  region: 'one call per region when swept across regions',
  project: 'one call per project when swept org-wide',
  account: 'one call per account',
  subscription: 'one call per subscription when swept tenant-wide',
};

function CodeList({items}) {
  return items.map((item, i) => (
    <React.Fragment key={item}>
      {i > 0 && ' '}
      <code>{item}</code>
    </React.Fragment>
  ));
}

export default function QueryPageHeader({frontMatter}) {
  const {
    providers = [],
    services = [],
    verb = 'select',
    status,
    auth = [],
    permissions = [],
    cost,
    last_verified: lastVerified,
    author,
    author_company: authorCompany,
  } = frontMatter;

  const showCostWarning = cost && (cost.fan_out !== 'none' || cost.expensive);

  return (
    <div className={styles.metaPanel}>
      <div className={styles.metaBadges}>
        <VerbBadge verb={verb} />
        <StatusBadge status={status} />
        {providers.map((p) => (
          <Link
            key={p}
            className="badge badge--secondary"
            to={`/docs/query-library/${familyOf(p)}`}
            style={{textDecoration: 'none'}}
          >
            {providerTitle(p)}
          </Link>
        ))}
        {lastVerified && (
          <span className={styles.lastVerified}>last verified {String(lastVerified)}</span>
        )}
      </div>
      <div className={styles.metaRow}>
        <span className={styles.metaLabel}>Services</span>
        <span className={styles.metaValue}>
          <CodeList items={services} />
        </span>
      </div>
      {auth.length > 0 && (
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Credentials</span>
          <span className={styles.metaValue}>
            <CodeList items={auth} />
          </span>
        </div>
      )}
      {permissions.length > 0 && (
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Permissions</span>
          <span className={styles.metaValue}>
            <CodeList items={permissions} />
          </span>
        </div>
      )}
      {(author || authorCompany) && (
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Contributed by</span>
          <span className={styles.metaValue}>
            {author}
            {author && authorCompany ? ', ' : ''}
            {authorCompany}
          </span>
        </div>
      )}
      {showCostWarning && (
        <div className={`alert alert--warning ${styles.costAlert}`} role="note">
          {cost.fan_out !== 'none' && (
            <>
              <strong>Fan-out: {cost.fan_out}</strong>
              {' - '}
              {FAN_OUT_TEXT[cost.fan_out] || 'iterates when run at scale'}
              {'. '}
            </>
          )}
          {cost.expensive && <>Expensive at scale. </>}
          {cost.notes}
        </div>
      )}
    </div>
  );
}
