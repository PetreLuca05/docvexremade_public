// The favicon and app-icon set, from the one source logo
// (public/assets/icon.png, 512x512). Run after changing the logo:
//   node scripts/icons.mjs
// It writes into public/ (committed; the build only copies them):
//   favicon.ico (16, 32, 48), favicon.svg, favicon-16x16.png, favicon-32x32.png,
//   apple-touch-icon.png (180, opaque), icon-192.png, icon-512.png,
//   icon-maskable-512.png (the logo inside the safe zone, on the brand colour),
//   mstile-144x144.png, mstile-150x150.png,
//   site.webmanifest, browserconfig.xml

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { SITE } from '../seo/config.js';

const root = resolve(import.meta.dirname, '..');
const out = (name) => resolve(root, 'public', name);
const source = readFileSync(resolve(root, 'public/assets/icon.png'));
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
// An SVG favicon wrapping the logo (the source is a raster image).
write(
  'favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128"><image width="128" height="128" xlink:href="data:image/png;base64,${(await png(128)).toString('base64')}"/></svg>\n`,
);
write('apple-touch-icon.png', await onBrand(180, 1));
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
