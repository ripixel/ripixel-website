import * as fs from 'fs';
import { js2xml } from 'xml-js';

import findInDir from './findInDir';

const SITE_ROOT = 'https://www.ripixel.co.uk/';

const generateSitemap = (): void => {
  // console.log('/// Beginning sitemap generation');

  const generatedPagesLocations = findInDir('./public', '.html');
  const generatedPages = generatedPagesLocations
    .filter(
      (page) => page !== 'public/404.html' && page !== 'public/index.html'
    )
    .map((page) => page.replace('public/', '').replace('.html', ''));

  const pagesModifiedDates: {
    [key: string]: Date;
  } = {};

  const templatePagesLocations = findInDir('./pages', '.html');
  const thoughtsPagesLocations = findInDir('./thoughts/articles', '.md');

  templatePagesLocations.forEach((pageLocation) => {
    pagesModifiedDates[
      SITE_ROOT +
        pageLocation
          .replace('pages/', '')
          .replace('.html', '')
          .replace('index', '')
    ] = fs.statSync(pageLocation).mtime;
  });

  thoughtsPagesLocations.forEach((pageLocation) => {
    pagesModifiedDates[
      SITE_ROOT + pageLocation.replace('articles/', '').replace('.md', '')
    ] = fs.statSync(pageLocation).mtime;
  });

  // console.log(
  //   `Found ${generatedPages.length} public pages (not including index or 404)`
  // );

  const generateUrlElement = (loc: string) => {
    let changefreq = loc === SITE_ROOT ? 'monthly' : 'weekly';
    let prio = loc === SITE_ROOT ? '1.0' : '0.8';

    if (loc.indexOf('thoughts/') > -1) {
      // is an article/subpage
      prio = '1';
      changefreq = 'yearly';
    }

    if (loc.indexOf('changelog') > 1) {
      // it's the changelog
      prio = '0.1';
      changefreq = 'weekly';
    }

    // console.log(loc, prio, changefreq);

    return {
      type: 'element',
      name: 'url',
      elements: [
        {
          type: 'element',
          name: 'loc',
          elements: [
            {
              type: 'text',
              text: loc,
            },
          ],
        },
        {
          type: 'element',
          name: 'lastmod',
          elements: [
            {
              type: 'text',
              text: pagesModifiedDates[loc].toISOString().split('T')[0],
            },
          ],
        },
        {
          type: 'element',
          name: 'changefreq',
          elements: [
            {
              type: 'text',
              text: changefreq,
            },
          ],
        },
        {
          type: 'element',
          name: 'priority',
          elements: [
            {
              type: 'text',
              text: prio,
            },
          ],
        },
      ],
    };
  };

  const sitemapJs = {
    declaration: {
      attributes: {
        version: '1.0',
        encoding: 'utf-8',
      },
    },
    elements: [
      {
        type: 'element',
        name: 'urlset',
        attributes: {
          xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
        },
        elements: [generateUrlElement(SITE_ROOT)],
      },
    ],
  };

  generatedPages.forEach((page) => {
    sitemapJs.elements[0].elements.push(generateUrlElement(SITE_ROOT + page));
  });

  const sitemapXml = js2xml(sitemapJs, { spaces: 4 });

  fs.writeFileSync('./public/sitemap.xml', sitemapXml, 'utf8');

  // console.log('/// Finished sitemap generation');
};

export default generateSitemap;
