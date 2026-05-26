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
            const lifeDir = './personal/items/life';

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
                try {
                    const files = fs.readdirSync(dir)
                        .filter(f => f.endsWith('.json'))
                        .sort();
                    const allEntries = [];
                    for (const file of files) {
                        const data = loadJson(path.join(dir, file));
                        if (Array.isArray(data)) {
                            allEntries.push(...data);
                        }
                    }
                    return allEntries;
                } catch (e) {
                    ctx.logger.warn(`Could not read directory ${dir}`);
                    return [];
                }
            };

            // Load each category
            const body = loadJson(path.join(lifeDir, 'body.json')) || {};
            const nutrition = loadJson(path.join(lifeDir, 'nutrition.json')) || {};
            const exercise = loadJson(path.join(lifeDir, 'fitness.json')) || {};
            const events = loadJson(path.join(lifeDir, 'events.json')) || {};
            const media = loadJson(path.join(lifeDir, 'media.json')) || {};
            const travel = loadJson(path.join(lifeDir, 'travel.json')) || {};
            const career = loadJson(path.join(lifeDir, 'career.json')) || {};

            // Merge time-series data if directories exist
            const weightHistory = loadTimeSeriesFiles(path.join(lifeDir, 'body', 'weight'));
            const exerciseHistory = loadTimeSeriesFiles(path.join(lifeDir, 'fitness', 'history'));

            // Combine into single life object
            ctx.globals.life = {
                body: {
                    ...body,
                    weightHistory,
                },
                nutrition,
                exercise: {
                    ...exercise,
                    history: exerciseHistory,
                },
                events: events.events || [],
                media,
                travel,
                career
            };

            ctx.logger.debug('Life data aggregated successfully');
            return {};
        }
    };
}

export const tasks = [
    // Clean & Create output directory
    prepareOutputTask({
        outDir: './public/personal',
    }),
    // Process main CSS (includes shared tokens)
    bundleCssTask({
        from: './personal/assets/styles/main',
        to: './public/personal',
        output: 'styles.min.css',
        minify: true,
    }),
    // Process Jamie CSS
    bundleCssTask({
        from: './personal/assets/styles/jamie',
        to: './public/personal',
        output: 'styles.jamie.min.css',
        minify: true,
    }),
    // Copy images/assets
    copyStaticTask({
        from: './personal/assets/images',
        to: './public/personal',
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
            siteUrl: 'https://james.ripixel.co.uk',
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
        itemsDir: './personal/items',
        partialsDir: './personal/partials',
        outDir: './public/personal',
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
        outFile: './personal/items/thoughts.json',
    }),
    // Generate RSS/Atom/JSON feeds for thoughts
    generateFeedTask({
        articles: '${thoughtsList}',
        outDir: './public/personal',
        site: {
            title: 'James King',
            description: 'Feed for thoughts articles',
            id: 'https://james.ripixel.co.uk/',
            link: 'https://james.ripixel.co.uk/',
            language: 'en',
            favicon: 'https://james.ripixel.co.uk/favicon.ico',
            copyright: `All rights reserved ${(new Date()).getFullYear()}, James King`,
            feedLinks: {
                json: 'https://james.ripixel.co.uk/json.json',
                atom: 'https://james.ripixel.co.uk/atom.xml',
            },
            author: {
                name: 'James King',
                email: 'ripixel+feed@gmail.com',
                link: 'https://james.ripixel.co.uk/',
            },
        },
    }),
    // Generate paginated thoughts listing
    generatePaginatedItemsTask({
        dataFile: './personal/items/thoughts.json',
        itemsPerPage: 10,
        template: './personal/templates/thoughts.html',
        partialsDir: './personal/partials',
        outDir: './public/personal',
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
        dataFile: './personal/items/life/fitness.json',
        dataKey: 'timeline',
        itemsPerPage: 10,
        template: './personal/templates/life-fitness.html',
        partialsDir: './personal/partials',
        outDir: './public/personal',
        basePath: '/life-fitness',
        outputVar: 'activities',
        paginationVar: 'pagination',
        additionalVarsFn: () => {
            const fitnessData = JSON.parse(fs.readFileSync('./personal/items/life/fitness.json', 'utf8'));
            return {
                page: 'life',
                description: 'Running, walking, and generally trying to stay active.',
                events: fitnessData.events,
            };
        },
    }),
    // Generate paginated life-media pages
    generatePaginatedItemsTask({
        dataFile: './personal/items/life/media.json',
        dataKey: 'timeline',
        itemsPerPage: 10,
        template: './personal/templates/life-media.html',
        partialsDir: './personal/partials',
        outDir: './public/personal',
        basePath: '/life-media',
        outputVar: 'items',
        paginationVar: 'pagination',
        additionalVarsFn: () => ({
            page: 'life',
            description: 'What I\'m watching, reading, listening to, and playing.',
        }),
    }),
    // Generate HTML pages
    generatePagesTask({
        pagesDir: './personal/pages',
        partialsDir: './personal/partials',
        outDir: './public/personal',

        additionalVarsFn: ({ currentPage, ...vars }) => {
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
                        case 'projects':
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
    // Generate sitemap.xml
    generateSitemapTask({
        outDir: './public/personal',
        scanDir: './public/personal',
        siteUrl: 'https://james.ripixel.co.uk',
    }),
    {
        name: 'Copy robots.txt',
        run: async () => {
            const robotsPath = './personal/assets/robots.txt';
            const copyToPath = './public/personal/robots.txt';
            fs.copyFileSync(robotsPath, copyToPath);
        }
    }
];
