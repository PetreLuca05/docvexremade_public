// The link-preview images: each page's heading on the DocVex template,
// rendered at build time (satori → SVG, resvg → PNG). Two sizes per page:
// 1200x630 (og:image, Twitter's large card) and 600x600 (the square
// fallback). See SHARING.md for the requirements they meet.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SITE } from './config.js';

const require = createRequire(import.meta.url);
const font = (pkg, file) => readFileSync(require.resolve(`${pkg}/files/${file}`));

// Each family twice: the Latin subset and the extended one (ă, â, î, ș, ț),
// under two names, so the renderer falls back from one to the other.
const FONTS = [
  ['Serif', '@fontsource/source-serif-4', 'source-serif-4', 400],
  ['Serif', '@fontsource/source-serif-4', 'source-serif-4', 600],
  ['Sans', '@fontsource/inter', 'inter', 400],
  ['Sans', '@fontsource/inter', 'inter', 600],
].flatMap(([name, pkg, base, weight]) =>
  ['latin', 'latin-ext'].map((subset) => ({
    name: subset === 'latin' ? name : `${name}Ext`,
    weight,
    style: 'normal',
    data: font(pkg, `${base}-${subset}-${weight}-normal.woff`),
  })),
);

const LOGO = `data:image/png;base64,${readFileSync(
  resolve(import.meta.dirname, '../public/assets/icon.png'),
).toString('base64')}`;

export const SIZES = {
  wide: { width: 1200, height: 630 },
  square: { width: 600, height: 600 },
};

const h = (type, style, children) => ({ type, props: { style, children } });

function template({ heading, kicker }, { width, height }) {
  const wide = width > height;
  const pad = wide ? 72 : 48;
  return h(
    'div',
    {
      width,
      height,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: pad,
      backgroundColor: SITE.themeDark,
      backgroundImage: `radial-gradient(circle at ${wide ? '85% 0%' : '80% 0%'}, rgba(230, 207, 154, 0.28), rgba(13, 20, 36, 0) ${wide ? 55 : 65}%)`,
      color: '#f5f2ea',
      fontFamily: 'Sans, SansExt',
    },
    [
      // The logo and the wordmark.
      h('div', { display: 'flex', alignItems: 'center', gap: 18 }, [
        { type: 'img', props: { src: LOGO, width: wide ? 64 : 56, height: wide ? 64 : 56 } },
        h(
          'div',
          { fontFamily: 'Serif, SerifExt', fontWeight: 600, fontSize: wide ? 40 : 34 },
          'docvex',
        ),
      ]),
      // The page.
      h(
        'div',
        { display: 'flex', flexDirection: 'column', gap: wide ? 22 : 18 },
        [
          kicker
            ? h(
                'div',
                {
                  color: SITE.accent,
                  fontWeight: 600,
                  fontSize: wide ? 24 : 20,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                },
                kicker,
              )
            : null,
          h(
            'div',
            {
              fontFamily: 'Serif, SerifExt',
              fontWeight: 400,
              fontSize: wide ? (heading.length > 34 ? 64 : 76) : heading.length > 30 ? 50 : 58,
              lineHeight: 1.08,
              maxWidth: wide ? 980 : 504,
            },
            heading,
          ),
        ].filter(Boolean),
      ),
      // The address, over a thin gold rule.
      h('div', { display: 'flex', flexDirection: 'column', gap: 18 }, [
        h('div', { width: 96, height: 3, backgroundColor: SITE.accent }, ''),
        h(
          'div',
          { fontSize: wide ? 24 : 20, color: 'rgba(245, 242, 234, 0.7)', letterSpacing: 1 },
          'docvex.ro',
        ),
      ]),
    ],
  );
}

// A PNG for one page at one size.
export async function renderImage(page, size) {
  const svg = await satori(template(page, size), { ...size, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: 'width', value: size.width } }).render().asPng();
}
