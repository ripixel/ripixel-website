import { Listr } from 'listr2';

import { parseCliArgs } from './utils/cli';

// --- Task Registry ---
// To add a new generator, simply add it to coreTasks in utils/taskRegistry.ts
import { coreTasks } from './utils/taskRegistry';

// Example: To add a new generator, edit utils/taskRegistry.ts:
// import generateRssFeed from '../generateRssFeed';
// coreTasks.push({ name: 'rss', title: 'Generate RSS Feed', run: () => generateRssFeed() });

// --- CLI Option Parsing ---
const { only, skip } = parseCliArgs(process.argv);

// --- Task Filtering Logic ---
let tasksToRun = coreTasks;
if (only && only.length > 0) {
  tasksToRun = coreTasks.filter(task => only.includes(task.name));
} else if (skip && skip.length > 0) {
  tasksToRun = coreTasks.filter(task => !skip.includes(task.name));
}

// --- Listr Task List ---
const listrTasks = tasksToRun.map(task => ({
  title: task.title,
  task: () => task.run(),
}));

async function main() {
  const runner = new Listr(listrTasks, { concurrent: false });
  try {
    await runner.run();
    console.log('\n✅ Site generation complete!');
  } catch (err) {
    console.error('❌ Site generation failed:', err);
    process.exit(1);
  }
}

main();
