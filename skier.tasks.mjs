// @ts-check
import fs from 'fs';
import path from 'path';
import {
  prepareOutputTask,
  bundleCssTask,
  copyStaticTask,
  setGlobalFromMarkdownTask,
  setGlobalsTask,
  generateItemsTask,
  generateFeedTask,
  generatePagesTask,
  generatePaginatedItemsTask,
  generateSitemapTask
} from 'skier';

// Custom task to write a global variable to a JSON file
function writeGlobalToJsonTask(config) {
  return {
    name: 'write-global-to-json',
    title: `Write ${config.globalVar} to ${config.outFile}`,
    config,
    run: async (cfg, ctx) => {
      const data = ctx.globals[cfg.globalVar];
      if (!data) {
        ctx.logger.warn(`Global variable '${cfg.globalVar}' not found`);
        return {};
      }
      const dir = path.dirname(cfg.outFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(cfg.outFile, JSON.stringify(data, null, 2));
      ctx.logger.debug(`Wrote ${cfg.globalVar} to ${cfg.outFile}`);
      return {};
    }
  };
}

export const tasks = [
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
      const latestVersion = match ? match[0] : undefined;
      return { latestVersion };
    }
  }),
  // Generate individual thought article pages
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
  // Write thoughtsList to JSON for pagination
  writeGlobalToJsonTask({
    globalVar: 'thoughtsList',
    outFile: './items/thoughts.json',
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
  // Generate paginated thoughts listing
  generatePaginatedItemsTask({
    dataFile: './items/thoughts.json',
    itemsPerPage: 5,
    template: './templates/thoughts.html',
    partialsDir: './partials',
    outDir: './public',
    basePath: '/thoughts',
    outputVar: 'thoughts',
    paginationVar: 'pagination',
    additionalVarsFn: () => ({
      page: 'thoughts',
      description: 'A peak inside my brain you ask? Reader, beware...',
    }),
  }),
  // Generate paginated life-fitness pages
  generatePaginatedItemsTask({
    dataFile: './items/life/fitness.json',
    dataKey: 'timeline',
    itemsPerPage: 10,
    template: './templates/life-fitness.html',
    partialsDir: './partials',
    outDir: './public',
    basePath: '/life-fitness',
    outputVar: 'activities',
    paginationVar: 'pagination',
    additionalVarsFn: () => {
      // Load events from the same JSON file for display on all pages
      const fitnessData = JSON.parse(fs.readFileSync('./items/life/fitness.json', 'utf8'));
      return {
        page: 'life',
        description: 'Running, walking, and generally trying to stay active.',
        events: fitnessData.events,
      };
    },
  }),
  // Generate paginated life-media pages
  generatePaginatedItemsTask({
    dataFile: './items/life/media.json',
    dataKey: 'timeline',
    itemsPerPage: 10,
    template: './templates/life-media.html',
    partialsDir: './partials',
    outDir: './public',
    basePath: '/life-media',
    outputVar: 'items',
    paginationVar: 'pagination',
    additionalVarsFn: () => ({
      page: 'life',
      description: 'What I\'m watching, reading, listening to, and playing.',
    }),
  }),
  // Generate HTML pages (excluding paginated pages)
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
          case 'life':
            return "What's going on in my life? Fitness, media, and upcoming events.";
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
