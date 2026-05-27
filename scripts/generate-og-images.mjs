// @ts-check
/**
 * Generates OG (Open Graph) card images for each site section.
 * Fonts must be installed to ~/.fonts/ before running — see README.
 * Run: node scripts/generate-og-images.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../personal/assets/images');

/** @type {{ id: string, label: string, glyph: string, ink: string, desc: string }[]} */
const PAGES = [
  { id: 'home',      label: 'HELLO!',      glyph: '☼', ink: '#F25B1C', desc: 'software engineer · web app creator · nottinghamshire, uk' },
  { id: 'projects',  label: 'PROJECTS.',   glyph: '◆', ink: '#D32E84', desc: 'things built, shipped, and occasionally abandoned.' },
  { id: 'thoughts',  label: 'THOUGHTS.',   glyph: '◇', ink: '#0F8A56', desc: 'ramblings, how-to guides & the occasional hot take.' },
  { id: 'profile',   label: 'PROFILE.',    glyph: '◉', ink: '#2148C0', desc: 'career history, tech stack, and a very long meeting history.' },
  { id: 'life',      label: 'FITNESS.',    glyph: '△', ink: '#7C3AED', desc: 'running, riding & generally trying to stay alive.' },
  { id: 'changelog', label: 'CHANGELOG.',  glyph: '◎', ink: '#F25B1C', desc: "what's changed on this site." },
  { id: '404',       label: '404.',        glyph: '×', ink: '#B7261F', desc: '(oh bollocks.)' },
];

/** @param {string} s */
function xmlEsc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Build an SVG card string for one page.
 * @param {{ label: string, glyph: string, ink: string, desc: string }} page
 */
function buildSVG({ label, glyph, ink, desc }) {
  label = xmlEsc(label);
  glyph = xmlEsc(glyph);
  desc  = xmlEsc(desc);
  // Approximate font-size for display label so it doesn't overflow
  // Anton is very condensed — ~0.52× em per char
  const labelLen = label.length;
  const maxPx = 960; // usable width for label
  const rawSize = Math.floor(maxPx / (labelLen * 0.52));
  const labelSize = Math.min(rawSize, 180);

  // Vertical position: centre the label in the card
  const labelY = 380;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <!-- Halftone dot tile -->
    <pattern id="dots" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="1.2" fill="${ink}" opacity="0.18"/>
    </pattern>
    <!-- Top-right ink wash -->
    <radialGradient id="wash1" cx="1100" cy="0" r="700" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${ink}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="${ink}" stop-opacity="0"/>
    </radialGradient>
    <!-- Bottom-left ink wash -->
    <radialGradient id="wash2" cx="80" cy="630" r="550" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${ink}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${ink}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Cream paper -->
  <rect width="1200" height="630" fill="#F5EFDF"/>

  <!-- Halftone wash -->
  <rect width="1200" height="630" fill="url(#dots)"/>

  <!-- Ink gradient washes -->
  <rect width="1200" height="630" fill="url(#wash1)"/>
  <rect width="1200" height="630" fill="url(#wash2)"/>

  <!-- Outer border (thick) -->
  <rect x="14" y="14" width="1172" height="602" fill="none" stroke="#171311" stroke-width="3"/>
  <!-- Inner border (thin double-rule) -->
  <rect x="20" y="20" width="1160" height="590" fill="none" stroke="#171311" stroke-width="1"/>

  <!-- Registration mark — top left -->
  <circle cx="50" cy="50" r="13" fill="none" stroke="${ink}" stroke-width="2"/>
  <line x1="36" y1="50" x2="64" y2="50" stroke="${ink}" stroke-width="2"/>
  <line x1="50" y1="36" x2="50" y2="64" stroke="${ink}" stroke-width="2"/>

  <!-- Section tag pill -->
  <rect x="44" y="78" width="220" height="30" fill="${ink}"/>
  <text x="52" y="99" font-family="'JetBrains Mono', 'Liberation Mono', monospace"
    font-size="14" font-weight="700" fill="#F5EFDF" letter-spacing="2">${glyph}  ${label.toUpperCase()}</text>

  <!-- Decorative large glyph (background) -->
  <text x="1090" y="540" text-anchor="middle"
    font-family="'JetBrains Mono', 'Liberation Mono', monospace"
    font-size="280" fill="${ink}" opacity="0.09">${glyph}</text>

  <!-- Main display label -->
  <text x="56" y="${labelY}"
    font-family="Anton, 'Impact', 'Liberation Sans Narrow', sans-serif"
    font-size="${labelSize}" font-weight="400" fill="#171311" letter-spacing="-2">${label}</text>

  <!-- Thin rule under label -->
  <line x1="56" y1="${labelY + 18}" x2="700" y2="${labelY + 18}" stroke="${ink}" stroke-width="2"/>

  <!-- Description line -->
  <text x="56" y="${labelY + 52}"
    font-family="'JetBrains Mono', 'Liberation Mono', monospace"
    font-size="20" fill="#171311" opacity="0.65">${desc}</text>

  <!-- "JAMES KING" byline (top right) -->
  <text x="1148" y="58" text-anchor="end"
    font-family="Anton, 'Impact', 'Liberation Sans Narrow', sans-serif"
    font-size="26" font-weight="400" fill="#171311" opacity="0.55" letter-spacing="1">JAMES KING</text>

  <!-- URL footer -->
  <text x="56" y="594"
    font-family="'JetBrains Mono', 'Liberation Mono', monospace"
    font-size="17" fill="#171311" opacity="0.45">james.ripixel.co.uk — a zine, by james king · est. 2015</text>

  <!-- Ink dot cluster (top right, registration marks) -->
  <circle cx="1148" cy="50" r="7"   fill="${ink}"/>
  <circle cx="1128" cy="50" r="7"   fill="${ink}" opacity="0.45"/>
  <circle cx="1108" cy="50" r="7"   fill="${ink}" opacity="0.2"/>
</svg>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const page of PAGES) {
    const svg = buildSVG(page);
    const svgPath = path.join(OUT_DIR, `card_${page.id}.svg`);
    const pngPath = path.join(OUT_DIR, `card_${page.id}.png`);

    fs.writeFileSync(svgPath, svg);

    execSync(
      `npx sharp-cli --input "${svgPath}" --output "${pngPath}" resize 1200 630`,
      { stdio: 'inherit' }
    );

    // Clean up intermediate SVG
    fs.unlinkSync(svgPath);

    console.log(`✓ card_${page.id}.png`);
  }

  console.log(`\nDone — ${PAGES.length} OG images written to ${OUT_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
