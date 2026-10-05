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

// The navbar, footer and every cross-site link come from the shared StackQL
// chrome (github.com/stackql/docusaurus-config), vendored into the
// gitignored .shared-config/ folder by the `vendor-config` script before
// every start and build - the same wiring the provider microsites use. One
// repo defines the header, footer and menus for every StackQL property, so
// the proxied library pages read as one site with stackql.io. This site
// cannot use the shared createConfig factory (it assumes a microsite at
// baseUrl '/' with its own preset), so the pieces are composed here: see
// "Composing instead of createConfig" in the shared README. The shared
// redirects plugin registers a local route under baseUrl for each main-site
// destination (so the links are internal here - no external-link icon, and
// the broken-link checker validates them) that client-side-forwards to the
// real page.
const shared = require('./.shared-config/index.js');

const baseUrl = '/docs/query-library/';

// Full public route paths of the shared redirect stubs: kept out of the
// sitemap and of structured-data JSON-LD emission below (the shared
// Redirect component noindexes them).
const redirectStubRoutes = shared.redirectRoutes(baseUrl);

// The site logo goes to the brand home, not this site's root (the shared
// default suits a microsite whose root is its own landing page). An
// external href renders without an icon; target keeps it in the same tab.
const logo = {
  ...shared.buildNavbar().logo,
  href: 'https://stackql.io/',
  target: '_self',
};

// Shared navbar, with the one destination that IS this site - AI Agents >
// Query Library - pointing at the library landing instead of its shared
// redirect route.
const navbar = (() => {
  const nav = shared.buildNavbar();
  return {
    ...nav,
    logo,
    items: nav.items.map((item) =>
      item.type === 'dropdown' && item.label === 'AI Agents'
        ? {
            ...item,
            items: item.items.map((child) =>
              child.label === 'Query Library' ? {...child, to: '/'} : child,
            ),
          }
        : item,
    ),
  };
})();

const footer = {...shared.buildFooter(), logo};

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
  baseUrl,

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
    // Local redirect routes for every shared main-site destination (see the
    // chrome note at the top of this file).
    shared.redirectsPlugin,
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
        // No src/pages: the main-site redirect stubs are routes registered
        // by the shared redirects plugin.
        pages: false,
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
      navbar,
      footer,
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
