// GENERATED-STYLE stub: the main-site docs root is https://stackql.io/
// itself, and '/' on this site is the library landing page, so the footer
// "Documentation" link and the sidebar "Back to docs" link use this /docs
// route and forward straight to the root (skipping stackql.io's own
// /docs -> / 301). See src/components/ExternalRedirect.
import React from 'react';
import ExternalRedirect from '@site/src/components/ExternalRedirect';

export default function RedirectPage() {
  return <ExternalRedirect to="https://stackql.io/" />;
}
