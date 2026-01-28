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

// Custom task to aggregate all life data from split JSON files
function aggregateLifeDataTask() {
  return {
    name: 'aggregate-life-data',
    title: 'Aggregate life data from JSON files',
    run: async (cfg, ctx) => {
      const lifeDir = './items/life';

      // Helper to safely load JSON
      const loadJson = (filepath) => {
        try {
          return JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (e) {
          ctx.logger.warn(`Could not load ${filepath}`);
          return null;
        }
      };

      // Helper to load and merge monthly/yearly files
      const loadTimeSeriesFiles = (dir, pattern) => {
        if (!fs.existsSync(dir)) return [];
        const files = fs.readdirSync(dir).filter(f => f.match(pattern));
        return files.sort().reverse().flatMap(f => {
          const data = loadJson(path.join(dir, f));
          return data?.entries || [];
        });
      };

      // Body data
      const weightHistory = loadJson(`${lifeDir}/body/weight-history.json`)?.entries || [];
      const measurementHistory = loadJson(`${lifeDir}/body/measurement-history.json`)?.entries || [];

      // Nutrition data
      const nutritionHistory = loadJson(`${lifeDir}/nutrition/history.json`)?.entries || [];
      const nutrition = {
        summary: loadJson(`${lifeDir}/nutrition/summary.json`) || {},
        history: nutritionHistory,
        recent: loadTimeSeriesFiles(`${lifeDir}/nutrition`, /^\d{4}-\d{2}\.json$/).slice(0, 14)
      };

      // Create unified body timeline - merge weight, measurements, and nutrition
      // Pre-format each entry with emoji, title, tag, and details for template
      const bodyTimeline = [
        ...weightHistory.map(w => ({
          date: w.date,
          type: 'weight',
          emoji: '⚖️',
          title: `${w.value} kg • ${w.bodyFat}% BF`,
          tag: w.avgHeartRate ? `Avg HR: ${w.avgHeartRate} bpm` : null,
          notes: w.notes
        })),
        ...measurementHistory.map(m => ({
          date: m.date,
          type: 'measurement',
          emoji: '📏',
          title: 'Body Measurements',
          details: [
            { label: 'Chest', value: `${m.chest} cm` },
            { label: 'Waist', value: `${m.waist} cm` },
            { label: 'Hips', value: `${m.hips} cm` },
            { label: 'L Arm', value: `${m.leftArm} cm` },
            { label: 'R Arm', value: `${m.rightArm} cm` }
          ],
          notes: m.notes
        })),
        ...nutritionHistory.map(n => ({
          date: n.date,
          type: 'nutrition',
          emoji: '🍎',
          title: `${n.calories} calories`,
          details: [
            { label: 'Protein', value: `${n.protein}g` },
            { label: 'Carbs', value: `${n.carbs}g` },
            { label: 'Fat', value: `${n.fat}g` }
          ],
          notes: n.notes
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      const body = {
        current: loadJson(`${lifeDir}/body/current.json`) || {},
        weightHistory,
        measurementHistory,
        timeline: bodyTimeline
      };

      // Exercise data - merge monthly files
      const exerciseEntries = loadTimeSeriesFiles(`${lifeDir}/exercise`, /^\d{4}-\d{2}\.json$/);
      const exercise = {
        summary: loadJson(`${lifeDir}/exercise/summary.json`) || {},
        recent: exerciseEntries.slice(0, 10),
        all: exerciseEntries
      };

      // Events
      const events = loadJson(`${lifeDir}/events/upcoming.json`) || { events: [] };

      // Media - summary and recent from each type
      const mediaSummary = loadJson(`${lifeDir}/media/summary.json`) || {};
      const films = loadTimeSeriesFiles(`${lifeDir}/media`, /^films-\d{4}\.json$/);
      const tv = loadTimeSeriesFiles(`${lifeDir}/media`, /^tv-\d{4}-\d{2}\.json$/);

      // Music files are different - each file IS the monthly summary, not an array of entries
      const loadMusicFiles = (dir, pattern) => {
        if (!fs.existsSync(dir)) return [];
        const files = fs.readdirSync(dir).filter(f => f.match(pattern));
        return files.sort().reverse().map(f => loadJson(path.join(dir, f))).filter(Boolean);
      };
      const musicMonths = loadMusicFiles(`${lifeDir}/media`, /^music-\d{4}-\d{2}\.json$/);

      const media = {
        summary: mediaSummary,
        current: mediaSummary.current || {},
        films: { recent: films.slice(0, 5), all: films },
        tv: { recent: tv.slice(0, 5), all: tv },
        music: { recent: musicMonths.slice(0, 3) }
      };

      // Travel
      const travel = loadJson(`${lifeDir}/travel/trips.json`) || { summary: {}, entries: [] };

      // Career/Salary
      const career = {
        salary: loadJson(`${lifeDir}/career/salary.json`) || { current: {}, history: [] }
      };

      // Set globals
      ctx.globals.life = {
        body,
        nutrition,
        exercise,
        events: events.events || [],
        media,
        travel,
        career
      };

      ctx.logger.info(`Loaded life data: ${exerciseEntries.length} exercises, ${films.length} films, ${events.events?.length || 0} events`);
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
    },
    valuesFn: globals => {
      // Extract first vX.Y.Z version from changelogHtml
      const match = globals.changelogHtml && globals.changelogHtml.match(/v(\d+\.\d+\.\d+)/i);
      const latestVersion = match ? match[0] : undefined;
      return { latestVersion };
    }
  }),
  // Aggregate life data from split JSON files
  aggregateLifeDataTask(),
  // Generate individual thought article pages
  generateItemsTask({
    itemsDir: './items',
    partialsDir: './partials',
    outDir: './public',
    outputVar: 'thoughtsList',
    // Custom excerpt: strip markdown links and return full first paragraph
    excerptFn: (rawMarkdown) => {
      // Get first paragraph (split by double newlines)
      const firstPara = rawMarkdown.split(/\n\s*\n/)[0] ?? '';
      // Strip markdown links: [text](url) -> text
      const stripped = firstPara.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      return stripped.trim();
    },
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
    itemsPerPage: 10,
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

    additionalVarsFn: ({ currentPage, ...vars }) => {
      // Map page names - life sub-pages should use 'life' as the page class
      const pageMapping = {
        'index': 'home',
        'life-body': 'life',
        'life-career': 'life',
        'life-travel': 'life',
        'life-music': 'life',
      };
      const page = pageMapping[currentPage] || currentPage;

      return {
        page,
        description: (() => {
          switch (page) {
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
      };
    },
  }),
  // Generate sitemap.xml by auto-discovering all .html files in ./public
  generateSitemapTask({
    outDir: './public',
    scanDir: './public',
    siteUrl: 'https://www.ripixel.co.uk',
  }),
  {
    name: 'Copy robots.txt',
    run: async () => {
      const robotsPath = './assets/robots.txt';
      const copyToPath = './public/robots.txt';
      fs.copyFileSync(robotsPath, copyToPath);
    }
  }
];
