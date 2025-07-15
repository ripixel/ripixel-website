// @ts-check
const { prepareOutputTask,
  bundleCssTask,
  copyStaticTask,
  setGlobalFromMarkdownTask,
  setGlobalsTask,
  generateItemsTask,
  generateFeedTask,
  generatePagesTask,
  generateSitemapTask } = require('skier');

exports.tasks = [
  // Clean & Create output directory (new built-in)
  prepareOutputTask({
    outDir: './public',
  }),
  // Process main CSS
  bundleCssTask({
    from: './assets/styles/main',
    to: './public',
    output: 'styles.min.css',
    minify: true,
  }),
  // Process Jamie CSS
  bundleCssTask({
    from: './assets/styles/jamie',
    to: './public',
    output: 'styles.jamie.min.css',
    minify: true,
  }),
  // Copy images/assets
  copyStaticTask({
    from: './assets/images',
    to: './public',
  }),
  // Read and convert CHANGELOG.md to HTML for downstream use
  setGlobalFromMarkdownTask({
    mdPath: './CHANGELOG.md',
    outputVar: 'changelogHtml',
  }),
  // Set some globals
  setGlobalsTask({
    values: {
      year: (new Date()).getFullYear(),
      noindex: process.env.NODE_ENV === 'production' ? '' : '<meta name="robots" content="noindex">',
    },
    valuesFn: globals => {
      // Extract first vX.Y.Z version from changelogHtml
      const match = globals.changelogHtml && globals.changelogHtml.match(/v(\d+\.\d+\.\d+)/i);
      const latestVersion = match ? match[1] : undefined;
      return { latestVersion };
    }
  }),
  // Generate thoughts
  generateItemsTask({
    itemsDir: './items',
    partialsDir: './partials',
    outDir: './public',
    outputVar: 'thoughtsList',
    additionalVarsFn: ({ section, title, excerpt }) => ({
      page: section,
      subpage: '| ' + title,
      description: excerpt,
    }),
  }),
  // Generate RSS/Atom/JSON feeds for thoughts
  generateFeedTask({
    articles: '${thoughtsList}', // Will be resolved from previous task output
    outDir: './public',
    site: {
      title: 'Ripixel (James King)',
      description: 'Feed for thoughts articles',
      id: 'https://www.ripixel.co.uk/',
      link: 'https://www.ripixel.co.uk/',
      language: 'en',
      favicon: 'https://www.ripixel.co.uk/favicon.ico',
      copyright: `All rights reserved ${(new Date()).getFullYear()}, James King`,
      feedLinks: {
        json: 'https://www.ripixel.co.uk/json.json',
        atom: 'https://www.ripixel.co.uk/atom.xml',
      },
      author: {
        name: 'James King',
        email: 'ripixel+feed@gmail.com',
        link: 'https://www.ripixel.co.uk/',
      },
    },
  }),
  // Generate HTML pages
  generatePagesTask({
    pagesDir: './pages',
    partialsDir: './partials',
    outDir: './public',
    additionalVarsFn: ({ currentPage, ...vars }) => ({
      page: currentPage === 'index' ? 'home' : currentPage,
      description: (() => {
        switch (currentPage === 'index' ? 'home' : currentPage) {
          case 'thoughts':
            return 'A peak inside my brain you ask? Reader, beware...';
          case 'profile':
            return `So who am I? I'm James King, a Software Engineer from Nottinghamshire. You want some more info?`;
          case 'coding':
            return "Shall we take a look at some projects I've done?";
          case 'changelog':
            return 'What changes have happened to this site?';
          case 'home':
            return "I'm James King, and I make things for the web";
          default:
            return vars.description || '';
        }
      })(),
    }),
  }),
  // Generate sitemap.xml by auto-discovering all .html files in ./public
  generateSitemapTask({
    outDir: './public',
    scanDir: './public',
    siteUrl: 'https://www.ripixel.co.uk',
  }),
];
