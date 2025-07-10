// TaskRegistry utility: Allows auto-discovery and registration of generators for humble.ts
// To add a new generator, export it from this file or add to the array below.

import * as path from 'path';
import { execa } from 'execa';
import generatePages from '../generatePages';
import generateThoughts from '../generateThoughts';
import generateSitemap from '../generateSitemap';
import generateChangelog from '../generateChangelog';
import { config } from '../../humble.config';
// Example: import generateRssFeed from '../generateRssFeed';

export interface TaskDef {
  name: string;
  title: string;
  run: () => Promise<any> | any;
}

// Resolve paths using config
const rootDir = path.resolve(config.rootDir);
const outDir = path.resolve(rootDir, config.outDir);
const cssDir = path.resolve(rootDir, config.cssDir);
const nodeModulesDir = path.resolve(rootDir, config.nodeModulesDir);
const imagesDir = path.resolve(rootDir, config.imagesDir);

export const coreTasks: TaskDef[] = [
  {
    name: 'create-output-dir',
    title: 'Create output directory',
    run: () => execa('mkdir', ['-p', outDir]),
  },
  {
    name: 'clean-output-dir',
    title: 'Clean output directory',
    run: () => execa('rm', ['-rf', `${outDir}/*`]),
  },
  {
    name: 'build-site-css',
    title: 'Build Site CSS',
    run: () => execa(`${nodeModulesDir}/clean-css-cli/bin/cleancss`, [
      '-o', `${outDir}/styles.min.css`, `${cssDir}/*.css`
    ]),
  },
  {
    name: 'build-jamie-css',
    title: 'Build Jamie CSS',
    run: () => execa(`${nodeModulesDir}/clean-css-cli/bin/cleancss`, [
      '-o', `${outDir}/styles.jamie.min.css`, `${cssDir}/jamie/*.css`
    ]),
  },
  {
    name: 'copy-images',
    title: 'Copy Images',
    run: () => execa('cp', ['-R', `${imagesDir}/.`, outDir]),
  },
  {
    name: 'pages',
    title: 'Build Pages',
    run: () => generatePages(),
  },
  {
    name: 'thoughts',
    title: 'Build Repeatable Pages',
    run: async () => {
      await execa('mkdir', ['-p', `${outDir}/thoughts`]);
      await generateThoughts();
    },
  },
  {
    name: 'sitemap',
    title: 'Generate Sitemap',
    run: () => generateSitemap(),
  },
  {
    name: 'changelog',
    title: 'Generate Changelog',
    run: () => generateChangelog(),
  },
  // Add new generators here, e.g.:
  // { name: 'rss', title: 'Generate RSS Feed', run: () => generateRssFeed() },
];

// Optionally, export a function for plugin/auto-discovery in the future.
// export function getAllTasks() { return [...coreTasks, ...pluginTasks]; }
