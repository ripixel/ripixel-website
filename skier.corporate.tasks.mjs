// @ts-check
import fs from 'fs';
import {
    prepareOutputTask,
    bundleCssTask,
    copyStaticTask,
    generatePagesTask,
    generateSitemapTask,
} from 'skier';

export const tasks = [
    // Clean & Create output directory
    prepareOutputTask({
        outDir: './public/corporate',
    }),
    // Process corporate CSS
    bundleCssTask({
        from: './corporate/assets/styles',
        to: './public/corporate',
        output: 'styles.min.css',
        minify: true,
    }),
    // Copy images/assets
    copyStaticTask({
        from: './corporate/assets/images',
        to: './public/corporate',
    }),
    // Generate HTML pages
    generatePagesTask({
        pagesDir: './corporate/pages',
        partialsDir: './corporate/partials',
        outDir: './public/corporate',
        additionalVarsFn: ({ currentPage }) => ({
            page: currentPage === 'index' ? 'home' : currentPage,
            description: 'Ripixel — Software consultancy & product studio based in the UK.',
            year: (new Date()).getFullYear(),
        }),
    }),
    // Generate sitemap.xml
    generateSitemapTask({
        outDir: './public/corporate',
        scanDir: './public/corporate',
        siteUrl: 'https://www.ripixel.co.uk',
    }),
    {
        name: 'Copy robots.txt',
        run: async () => {
            const robotsContent = `User-agent: *\nAllow: /\nSitemap: https://www.ripixel.co.uk/sitemap.xml`;
            fs.writeFileSync('./public/corporate/robots.txt', robotsContent);
        }
    }
];
