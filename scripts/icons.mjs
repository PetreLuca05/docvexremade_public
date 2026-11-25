// The favicon and app-icon set, from the one source logo: the DocVex seal
// (public/assets/seal.svg, the wax seal of the site's header). Run after
// changing it:
//   node scripts/icons.mjs
// It writes into public/ (committed; the build only copies them):
//   assets/seal.png (512, for the link previews and open.html),
//   favicon.ico (16, 32, 48), favicon.svg (the seal itself, as a vector),
//   favicon-16x16.png, favicon-32x32.png,
//   apple-touch-icon.png (180, opaque), icon-192.png, icon-512.png,
//   icon-maskable-512.png (the logo inside the safe zone, on the brand colour),
//   mstile-144x144.png, mstile-150x150.png,
//   site.webmanifest, browserconfig.xml
// (public/assets/icon.png, the earlier logo, is kept for the admin dashboard.)

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { SITE } from '../seo/config.js';

const root = resolve(import.meta.dirname, '..');
const out = (name) => resolve(root, 'public', name);
const svg = readFileSync(resolve(root, 'public/assets/seal.svg'), 'utf8');

// The seal drawn large (200 units at 10 px each), cut to the wax with a thin
// margin and made square, so it fills even a 16 px tab icon.
const SCALE = 10;
const MARGIN = 0.03;
const drawn = await sharp(Buffer.from(svg), { density: 72 * SCALE })
  .trim({ threshold: 1 })
  .png()
  .toBuffer({ resolveWithObject: true });
const side = Math.ceil(Math.max(drawn.info.width, drawn.info.height) * (1 + 2 * MARGIN));
const source = await sharp({
  create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: drawn.data, gravity: 'center' }])
  .png()
  .toBuffer();
// The same square, in the SVG's own units, for favicon.svg.
const left = -drawn.info.trimOffsetLeft / SCALE - (side - drawn.info.width) / 2 / SCALE;
const top = -drawn.info.trimOffsetTop / SCALE - (side - drawn.info.height) / 2 / SCALE;
const box = `${left.toFixed(2)} ${top.toFixed(2)} ${(side / SCALE).toFixed(2)} ${(side / SCALE).toFixed(2)}`;
const BRAND = SITE.themeDark;

const png = (size) => sharp(source).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

// The logo on the brand colour, at `scale` of the canvas (no transparency:
// iOS and Windows fill transparent pixels with black or white).
const onBrand = async (size, scale) => {
  const inner = Math.round(size * scale);
  const logo = await sharp(source).resize(inner, inner).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BRAND } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
};

// An .ico holding PNG images (every current browser and Windows reads them).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const written = [];
const write = (name, data) => {
  writeFileSync(out(name), data);
  written.push(`${name} (${data.length} B)`);
};

write(
  'favicon.ico',
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(size) })))),
);
write('favicon-16x16.png', await png(16));
write('favicon-32x32.png', await png(32));
// The SVG favicon: the seal itself, framed like the PNGs.
write(
  'favicon.svg',
  `${svg
    .replace(/<!--[\s\S]*?-->\s*/g, '')
    .trim()
    .replace(/viewBox="[^"]*"/, `viewBox="${box}"`)}\n`,
);
write('assets/seal.png', await png(512));
write('apple-touch-icon.png', await onBrand(180, 0.84));
write('icon-192.png', await png(192));
write('icon-512.png', await png(512));
// Maskable: Android crops to a circle or squircle, keeping the inner 80%.
write('icon-maskable-512.png', await onBrand(512, 0.72));
write('mstile-144x144.png', await onBrand(144, 0.8));
write('mstile-150x150.png', await onBrand(150, 0.8));

write(
  'site.webmanifest',
  `${JSON.stringify(
    {
      name: SITE.name,
      short_name: SITE.name,
      description: SITE.description,
      lang: SITE.lang,
      id: '/',
      start_url: '/',
      scope: '/',
      display: 'minimal-ui',
      background_color: SITE.themeDark,
      theme_color: SITE.themeDark,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        {
          src: '/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    null,
    2,
  )}\n`,
);

write(
  'browserconfig.xml',
  `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/mstile-150x150.png"/>
      <TileColor>${BRAND}</TileColor>
    </tile>
  </msapplication>
</browserconfig>
`,
);

console.log(written.join('\n'));
