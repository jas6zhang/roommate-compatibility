/**
 * Renders the static link-preview card to public/og.png.
 *
 * This is a one-off build tool, not part of `next build`. The card is
 * deliberately generic — share links carry both people's answers in the URL
 * fragment, and a preview image is fetched by the messaging app, so the preview
 * must never depend on a profile.
 *
 * Run:  node scripts/generate-og.mjs
 *
 * sharp comes along as an optional dependency of Next, so there is nothing extra
 * to install. Regenerate and commit public/og.png whenever the card changes.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/og.png');

const W = 1200;
const H = 630;
const PAD = 84;

// Same tokens as the site: surface, inks, and the validated categorical pair.
const SURFACE = '#fcfcfb';
const INK = '#0b0b0b';
const INK_2 = '#52514e';
const MUTED = '#898781';
const BLUE = '#2a78d6';
const ORANGE = '#eb6834';
const BLUE_WASH = '#cde2fb';

const FONT = 'DejaVu Sans, Noto Sans, sans-serif';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${SURFACE}"/>

  <text x="${PAD}" y="${PAD + 30}" font-family="${FONT}" font-size="24" font-weight="600"
        letter-spacing="3.4" fill="${MUTED}">ROOMMATE COMPATIBILITY</text>

  <text x="${PAD}" y="${PAD + 156}" font-family="${FONT}" font-size="94" font-weight="bold"
        letter-spacing="-2.5" fill="${INK}">Will you live</text>
  <text x="${PAD}" y="${PAD + 262}" font-family="${FONT}" font-size="94" font-weight="bold"
        letter-spacing="-2.5" fill="${INK}">well together?</text>

  <text x="${PAD}" y="${PAD + 336}" font-family="${FONT}" font-size="29" fill="${INK_2}">Sleep · Cleanliness · Guests · Temperature · Noise · Chores · Money</text>

  <g transform="translate(${PAD}, ${PAD + 388})">
    <rect width="268" height="14" rx="7" fill="${BLUE}"/>
    <rect x="284" width="124" height="14" rx="7" fill="${ORANGE}"/>
    <rect x="424" width="62" height="14" rx="7" fill="${BLUE_WASH}"/>
  </g>

  <text x="${PAD}" y="${PAD + 476}" font-family="${FONT}" font-size="25" fill="${MUTED}">26 questions · no account · answers never leave your browser</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(OUT, png);
console.log(`wrote ${OUT} — ${(png.length / 1024).toFixed(1)} KB`);
