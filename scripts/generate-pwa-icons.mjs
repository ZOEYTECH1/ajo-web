// Generates the PWA icon set from the real brand mark (public/ajo-logo.svg)
// into public/icons/. Re-run this (`node scripts/generate-pwa-icons.mjs`)
// whenever the logo artwork changes -- these PNGs are committed, not built
// on the fly, so manifest.webmanifest can reference stable file paths.
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const outDir = join(publicDir, 'icons');
mkdirSync(outDir, { recursive: true });

// The logo's entrance animation sets every group to opacity:0 and animates
// in via CSS keyframes. A static rasterizer never runs that animation, so
// rendering the file as-is produces a blank image -- strip the <style>
// block entirely so every element falls back to its default (fully
// opaque) state instead.
const rawSvg = readFileSync(join(publicDir, 'ajo-logo.svg'), 'utf-8');
const staticSvg = rawSvg.replace(/<style>[\s\S]*?<\/style>/, '');

// viewBox is "0 0 680 620" -- not square. Pad to a square canvas so the
// icon isn't stretched/distorted when placed in a square manifest slot.
const VIEWBOX_W = 680;
const VIEWBOX_H = 620;
const SQUARE = Math.max(VIEWBOX_W, VIEWBOX_H);
const padX = (SQUARE - VIEWBOX_W) / 2;
const padY = (SQUARE - VIEWBOX_H) / 2;

function squareSvg({ background, scale }) {
  // `scale` shrinks the logo content around its own center, leaving a
  // margin of solid `background` on all sides -- required for maskable
  // icons (OS may crop to a circle/squircle, so content must stay inside
  // a safe inner zone) and nice to have for the iOS apple-touch-icon too
  // (iOS never shows transparency correctly, it needs an opaque fill).
  const cx = VIEWBOX_W / 2;
  const cy = VIEWBOX_H / 2;
  return `<svg width="${SQUARE}" height="${SQUARE}" viewBox="0 0 ${SQUARE} ${SQUARE}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${SQUARE}" height="${SQUARE}" fill="${background}"/>
    <g transform="translate(${padX},${padY}) translate(${cx},${cy}) scale(${scale}) translate(${-cx},${-cy})">
      ${staticSvg.replace(/<\?xml[^>]*\?>/, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}
    </g>
  </svg>`;
}

const jobs = [
  // "any" purpose -- transparent background, content fills the canvas.
  // Browsers/OSes that support "any" never crop these, so no safe zone needed.
  { file: 'icon-192.png', size: 192, svg: squareSvg({ background: 'none', scale: 1 }) },
  { file: 'icon-512.png', size: 512, svg: squareSvg({ background: 'none', scale: 1 }) },
  // "maskable" -- OS crops to circle/squircle/rounded-square, so content
  // must stay inside the ~80% safe zone. Solid background fills the rest.
  { file: 'icon-maskable-512.png', size: 512, svg: squareSvg({ background: '#F8FAFC', scale: 0.72 }) },
  // iOS home screen icon -- iOS renders transparency as solid black, so
  // this always needs an explicit opaque background. iOS also auto-rounds
  // the corners itself, so no safe-zone shrink needed, just a touch of
  // margin so the mark doesn't touch the edge before rounding.
  { file: 'apple-touch-icon.png', size: 180, svg: squareSvg({ background: '#F8FAFC', scale: 0.88 }) },
];

for (const job of jobs) {
  const outPath = join(outDir, job.file);
  await sharp(Buffer.from(job.svg))
    .resize(job.size, job.size)
    .png()
    .toFile(outPath);
  console.log(`wrote ${outPath}`);
}
