import React, {useEffect} from 'react';
import Head from '@docusaurus/Head';

// Body for the redirect stub pages under src/pages/. This site is proxied
// under stackql.io/docs/query-library/, and its navbar/footer mirror the
// main site's; the stubs give those main-site destinations real internal
// routes (so links render without the external-link icon and satisfy the
// broken-link checker) and immediately forward to the real page on
// stackql.io. Stub routes are noindexed here and excluded from the sitemap
// and structured-data emission in docusaurus.config.js.
export default function ExternalRedirect({to}) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <>
      <Head>
        <meta httpEquiv="refresh" content={`0; url=${to}`} />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={to} />
        <title>Redirecting...</title>
      </Head>
      <p style={{padding: '2rem', fontFamily: 'sans-serif'}}>
        Redirecting to <a href={to}>{to}</a>...
      </p>
    </>
  );
}
