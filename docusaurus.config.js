// @ts-nocheck
// Site shell for the StackQL query library. This repo builds and deploys as
// its own Netlify site (origin: query-library.stackql.io) but is SERVED to
// the public through the main site's proxy rewrite at
// https://stackql.io/docs/query-library/* - see netlify.toml in this repo
// and the [[redirects]] block for /docs/query-library/* in the stackql.io
// repo's netlify.toml. That coupling drives `url` and `baseUrl` below.

const {themes} = require('prism-react-renderer');
const darkCodeTheme = themes.dracula;
const nightOwlCodeTheme = themes.nightOwl;

// The navbar and footer mirror the main stackql.io site so the proxied
// library pages read as one site. Every main-site destination has a stub
// page under src/pages/ (rendering src/components/ExternalRedirect) so the
// links are internal routes here - no external-link icon, and the
// broken-link checker validates them. Stub paths equal the main site's own
// canonical paths (the docs tree there is served at the site root, so
// e.g. /mcp not /docs/mcp). The one exception is the docs root itself,
// stackql.io/: '/' here is the library landing, so that destination is the
// /docs stub, which forwards straight to the root. The `to` values below
// are baseUrl-relative; keep them in lockstep with the stub files and with
// the main repo's chrome config (docusaurus.config.js there: navbar.items,
// footerStackQLItems, footerMoreItems, blogSections, and the `featured`
// entries of src/configs/providers.json for the Providers dropdown).
const mainSitePaths = [
  '/docs',
  '/installing-stackql',
  '/contact-us',
  '/stackql-deploy',
  '/command-line-usage/mcp',
  '/mcp',
  '/mcp/embedded',
  '/quick-starts',
  '/blog/product',
  '/blog/providers',
  '/blog/tutorials',
  '/providers',
  '/providers/aws',
  '/providers/azure',
  '/providers/google',
  '/providers/cloudflare',
  '/providers/databricks-account',
  '/providers/snowflake',
  '/providers/confluent',
  '/providers/okta',
  '/providers/openai',
  '/providers/github',
];
// Full public route paths of the stubs (baseUrl + path): kept out of the
// sitemap and of structured-data JSON-LD emission below.
const redirectStubRoutes = mainSitePaths.map((p) => `/docs/query-library${p}`);

// The main site's Providers dropdown lists the `featured` entries of its
// provider catalog in catalog order, labelled by shortName. Databricks'
// canonical slug there is databricks-account (the family-level
// /providers/databricks route was retired and now 301s to /registry).
const providerDropDownListItems = [
  {label: 'AWS', to: '/providers/aws'},
  {label: 'Azure', to: '/providers/azure'},
  {label: 'Google', to: '/providers/google'},
  {label: 'Cloudflare', to: '/providers/cloudflare'},
  {label: 'Databricks', to: '/providers/databricks-account'},
  {label: 'Snowflake', to: '/providers/snowflake'},
  {label: 'Confluent', to: '/providers/confluent'},
  {label: 'Okta', to: '/providers/okta'},
  {label: 'OpenAI', to: '/providers/openai'},
  {label: 'GitHub', to: '/providers/github'},
  {label: '... More', to: '/providers'},
];

// Blog sections: one @docusaurus/plugin-content-blog instance each on the
// main site, at /blog/<id>. As there, the header entries carry a bullhorn
// on the two announcement sections, the footer entries are plain, and the
// /blog landing page is deliberately not linked from the chrome.
const blogSections = [
  {id: 'product', label: 'Product Announcements', navLabel: '📣 Product Announcements'},
  {id: 'providers', label: 'Provider Announcements', navLabel: '📣 Provider Announcements'},
  {id: 'tutorials', label: 'Tutorials'},
];

const blogSectionNavItems = blogSections.map(({id, label, navLabel}) => ({
  label: navLabel || label,
  to: `/blog/${id}`,
}));

const blogSectionFooterItems = blogSections.map(({id, label}) => ({
  label,
  to: `/blog/${id}`,
}));

const footerStackQLItems = [
  // The main site links its docs root, stackql.io/ - see the /docs stub note above.
  {label: 'Documentation', to: '/docs'},
  {label: 'Install', to: '/installing-stackql'},
  {label: 'Contact us', to: '/contact-us'},
];

const footerMoreItems = [
  {label: 'Providers', to: '/providers'},
  {label: 'stackql-deploy', to: '/stackql-deploy'},
  ...blogSectionFooterItems,
  {label: 'Quick Starts', to: '/quick-starts'},
];

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'StackQL Query Library',
  staticDirectories: ['static'],
  tagline: 'Curated, parameterized StackQL queries for cloud inventory, security and operations',

  // CONTRACT: `url` + `baseUrl` must equal the public prefix the main site
  // proxies to this origin (stackql.io repo netlify.toml: proxy rewrite
  // from = "/docs/query-library/*" to = "https://query-library.stackql.io/:splat").
  // The proxy STRIPS the prefix, so this build is published at the origin
  // root while every emitted link/asset/canonical URL carries the prefix.
  // Consequence: browsing the raw subdomain directly shows broken asset
  // paths - expected; canonical tags point at stackql.io. These two values
  // and the main repo's redirect must agree forever.
  url: 'https://stackql.io',
  baseUrl: '/docs/query-library/',

  onBrokenLinks: 'throw',
  favicon: 'favicon.ico',
  organizationName: 'stackql',
  projectName: 'query-library.stackql.io',
  baseUrlIssueBanner: false,
  trailingSlash: false,
  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
  ],
  plugins: [
    '@stackql/docusaurus-plugin-structured-data',
    [
      '@stackql/docusaurus-plugin-aeo',
      {
        companions: {
          // The landing and provider pages are MDX stubs that mount React
          // components - their raw source is meaningless to LLM consumers,
          // and the markdown catalogue already lives at
          // /docs/query-library/index.md (single-segment glob: query pages
          // under /docs/query-library/queries/** keep their companions).
          exclude: ['/docs/query-library', '/docs/query-library/*'],
        },
        llmsTxt: {
          instanceSections: {
            'docusaurus-plugin-content-docs@query-library': { title: 'Query Library', order: 1 },
          },
        },
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        // The query library content surface - the site's only content
        // plugin. Sources are authored under query-library/ and rendered at
        // /docs/query-library/* (baseUrl supplies the prefix); the
        // tool-facing .md/.json artifacts at the same public URL prefix are
        // compiled by query-library/scripts/build-artifacts.py into
        // static/docs/query-library/ (see CONTRIBUTING.md at the repo root).
        id: 'query-library',
        path: 'query-library',
        routeBasePath: '/',
        sidebarPath: require.resolve('./sidebars-query-library.js'),
        // Only index.md and queries/** are docs; everything else in
        // query-library/ is tooling. The markdown excludes are defensive -
        // stray non-doc markdown dropped under query-library/ must never
        // become a page. Underscore excludes mirror the defaults.
        exclude: [
          'schema/**',
          'scripts/**',
          'templates/**',
          'CONTRIBUTING.md',
          'CLAUDE.md',
          'README.md',
          '**/_*.{js,jsx,ts,tsx,md,mdx}',
          '**/_*/**',
        ],
        onInlineTags: 'ignore',
        editUrl: 'https://github.com/stackql/query-library.stackql.io/edit/main/',
      },
    ],
  ],
  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: false,
        blog: false,
        // src/pages holds only the redirect stubs for main-site nav targets.
        pages: {},
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: [...redirectStubRoutes, '/docs/query-library/search'],
          filename: 'sitemap.xml',
        },
        theme: {
          customCss: require.resolve('./src/css/global.css'),
        },
      }),
    ],
  ],
  markdown: {
    // 'detect' parses .md files as CommonMark and .mdx files as MDX. Query
    // entries are .md and carry {{placeholders}} and literal JSON braces in
    // prose, which MDX would treat as expressions and fail on; the landing
    // and provider stubs are .mdx component mounts. Do not revert to the
    // default ('mdx'): a top-level `format: md` front matter key does NOT
    // override the parser (only nested `mdx.format` does), so entries have
    // no per-file escape hatch - this config is the only thing keeping
    // braces in prose from breaking the build.
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      structuredData: {
        excludedRoutes: redirectStubRoutes,
        verbose: false,
        techArticleRoutePrefixes: ['/docs/'],
        featuredImageDimensions: {
          width: 1200,
          height: 627,
        },
        // No blog on this site, but the plugin requires the key.
        authors: {},
        organization: {
          sameAs: [
            'https://twitter.com/stackql',
            'https://www.linkedin.com/company/stackql',
            'https://github.com/stackql',
            'https://www.youtube.com/@stackql',
            'https://hub.docker.com/u/stackql',
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            email: 'info@stackql.io',
          },
          logo: {
            '@type': 'ImageObject',
            inLanguage: 'en-US',
            '@id': 'https://stackql.io/#logo',
            url: 'https://stackql.io/img/stackql-cover.png',
            contentUrl: 'https://stackql.io/img/stackql-cover.png',
            width: 1440,
            height: 900,
            caption: 'StackQL - your cloud using SQL',
          },
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'AU',
            postalCode: '3001',
            streetAddress: 'Level 24, 570 Bourke Street, Melbourne, Victoria',
          },
          taxID: 'ABN 65 656 147 054',
        },
        website: {
          inLanguage: 'en-US',
        },
        webpage: {
          inLanguage: 'en-US',
          datePublished: '2021-07-01',
        },
        breadcrumbLabelMap: {
          'query-library': 'Query Library',
          'queries': 'Queries',
        },
      },
      metadata: [
        {name: 'description', content: 'A curated library of parameterized, known-good StackQL queries for cloud inventory, security and operations, consumed by humans and by the stackql MCP server.'},
        {property: 'og:description', content: 'A curated library of parameterized, known-good StackQL queries for cloud inventory, security and operations, consumed by humans and by the stackql MCP server.'},
        {name: 'robots', content: 'index,follow'},
        {name: 'keywords', content: 'stackql, sql, query library, cloud inventory, cloud security, mcp, ai agents'},
        {name: 'twitter:site', content: '@stackql'},
        {name: 'og:site_name', content: 'StackQL'},
        {name: 'theme-color', content: '#0f4c81'},
      ],
      image: '/img/stackql-featured-image.png',
      // Same DocSearch as the main site (shared 'stackql' index), so the
      // navbar carries the same search button. Conditional so local and CI
      // builds work with no env vars; set the ALGOLIA_* vars on Netlify.
      ...(process.env.ALGOLIA_APP_ID ? {
        algolia: {
          appId: process.env.ALGOLIA_APP_ID,
          apiKey: process.env.ALGOLIA_API_KEY,
          indexName: process.env.ALGOLIA_INDEX_NAME,
          contextualSearch: false,
          // Shared index with the main site: results outside this app's
          // routes (anything not under /docs/query-library) must navigate
          // via a full page load, not the SPA router - there is no matching
          // route here and history.push would land on the 404.
          externalUrlRegex: 'stackql\\.io/(?!docs/query-library)',
          searchParameters: {},
          searchPagePath: 'search',
          insights: false,
          askAi: process.env.ALGOLIA_AGENTID,
        },
      } : {}),
      docs: {
        sidebar: {
          hideable: true,
        },
      },
      navbar: {
        logo: {
          alt: 'StackQL',
          // Same behavior as the main site's logo (-> home). External href
          // renders without an icon; target keeps it in the same tab.
          href: 'https://stackql.io/',
          target: '_self',
          src: 'img/logo-original.svg',
          srcDark: 'img/logo-white.svg',
        },
        items: [
          {
            to: '/installing-stackql',
            label: 'Install',
            position: 'left',
          },
          {
            type: 'dropdown',
            label: 'AI Agents',
            position: 'left',
            items: [
              {
                to: '/command-line-usage/mcp',
                label: 'MCP Server',
              },
              {
                to: '/mcp',
                label: 'MCP Tools',
              },
              {
                to: '/mcp/embedded',
                label: 'Embedded MCP',
              },
              {
                // The one destination that IS this site: the library landing.
                to: '/',
                label: 'Query Library',
              },
            ],
          },
          {
            to: '/stackql-deploy',
            label: 'stackql-deploy',
            position: 'left',
          },
          {
            to: '/providers',
            type: 'dropdown',
            label: 'Providers',
            position: 'left',
            items: providerDropDownListItems,
          },
          {
            type: 'dropdown',
            label: 'More',
            position: 'left',
            items: [
              ...blogSectionNavItems,
              {
                to: '/quick-starts',
                label: 'Quick Starts',
              },
            ],
          },
          {
            href: 'https://github.com/stackql/stackql',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      footer: {
        style: 'dark',
        logo: {
          alt: 'StackQL',
          href: 'https://stackql.io/',
          target: '_self',
          src: 'img/logo-original.svg',
          srcDark: 'img/logo-white.svg',
        },
        links: [
          {
            title: 'StackQL',
            items: footerStackQLItems,
          },
          {
            title: 'More',
            items: footerMoreItems,
          },
        ],
        copyright: `© ${new Date().getFullYear()} StackQL Studios ABN 65 656 147 054`,
      },
      colorMode: {
        respectPrefersColorScheme: true,
      },
      prism: {
        darkTheme: darkCodeTheme,
        theme: (() => {
          var theme = nightOwlCodeTheme;
          // Differentiate YAML keys from values (front matter fences in
          // query pages) - few Prism themes do this out of the box.
          theme.styles.push({
            types: ['atrule'],
            style: {
              // color chosen from the nightowl theme palette
              color: 'rgb(255, 203, 139)',
            },
          });
          return theme;
        })(),
      },
    }),
};

module.exports = config;
