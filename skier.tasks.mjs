// @ts-check
// Wrapper that delegates to the correct site's tasks based on SKIER_SITE env var.
// Usage:
//   SKIER_SITE=personal skier        (builds personal site)
//   SKIER_SITE=corporate skier       (builds corporate site)

const site = process.env.SKIER_SITE || 'personal';

let mod;
if (site === 'corporate') {
  mod = await import('./skier.corporate.tasks.mjs');
} else {
  mod = await import('./skier.personal.tasks.mjs');
}

export const tasks = mod.tasks;
