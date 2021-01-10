/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from 'path';
import { Listr } from 'listr2';
import execa from 'execa';

import generatePages from './generatePages';
import generateThoughts from './generateThoughts';
import generateSitemap from './generateSitemap';
import generateChangelog from './generateChangelog';

import { config } from '../humble.config';

const rootDir = path.resolve(config.rootDir);
const outDir = path.resolve(rootDir, config.outDir);
const cssDir = path.resolve(rootDir, config.cssDir);
const nodeModulesDir = path.resolve(rootDir, config.nodeModulesDir);
const imagesDir = path.resolve(rootDir, config.imagesDir);
// const pagesDir = path.resolve(rootDir, config.pagesDir);
// const partialsDir = path.resolve(rootDir, config.partialsDir);

const allTaskList = [
  {
    title: 'Create output directory',
    task: () => execa(`mkdir`, ['-p', `${outDir}`]),
  },
  {
    title: 'Clean output directory',
    task: () => execa(`rm`, [`-rf`, `${outDir}/*`]),
  },
  {
    title: 'Build CSS',
    task: () =>
      execa(`${nodeModulesDir}/clean-css-cli/bin/cleancss`, [
        `-o`,
        `${outDir}/styles.min.css`,
        `${cssDir}/*.css`,
      ]),
  },
  {
    title: 'Copy Images',
    task: () => execa(`cp`, [`-R`, `${imagesDir}/.`, `${outDir}/`]),
  },
  {
    title: 'Build Pages',
    task: () => generatePages(),
  },
  {
    title: 'Build Repeatable Pages',
    task: () =>
      execa(`mkdir`, [`-p`, `${outDir}/thoughts`]).then(() =>
        generateThoughts()
      ),
  },
];

const prodTaskList = [
  {
    title: 'Build Favicons',
    task: () =>
      execa(`node`, [`${nodeModulesDir}/favicons-generate/bin/cli.js`]),
    skip: () => !config.generateFavicons,
  },
  {
    title: 'Build Sitemap',
    task: () => generateSitemap(),
  },
  {
    title: 'Build Changelog',
    task: () => generateChangelog(),
  },
];

const toExecute =
  process.env.NODE_ENV !== 'development'
    ? [...allTaskList, ...prodTaskList]
    : allTaskList;

new Listr(toExecute).run();
