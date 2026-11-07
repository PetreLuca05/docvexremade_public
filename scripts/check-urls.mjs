// Requests every page of the built site (dist/, via vite preview) and checks
// it answers 200 with Romanian HTML. The site had no English URLs: English
// was a switch on the same pages, so old bookmarks (with or without a
// ?lang=en someone appended) must still open the Romanian page. Run after
// `npm run build`: `npm run check:urls`.
import { readdirSync, readFileSync } from 'node:fs';
import { preview } from 'vite';

const PAGES = [
  '/',
  '/index.html',
  '/instalare.html',
  '/preturi.html',
  '/cont.html',
  '/autentificare.html',
  '/dev.html',
  '/confidentialitate.html',
  '/cookies.html',
  '/termeni.html',
  '/informatii-legale.html',
];

const server = await preview({ preview: { port: 4179, strictPort: true }, logLevel: 'silent' });
const base = 'http://localhost:4179';
let failed = 0;

for (const path of PAGES.flatMap((p) => [p, `${p}?lang=en`])) {
  const res = await fetch(base + path, { redirect: 'manual' });
  const html = await res.text();
  const problems = [];
  if (res.status !== 200) problems.push(`status ${res.status}`);
  if (!html.includes('<html lang="ro"')) problems.push('not <html lang="ro">');
  if (problems.length) failed++;
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${path}${problems.length ? `: ${problems.join(', ')}` : ''}`);
}

// No language switch left in the bundles.
for (const file of readdirSync('dist/assets').filter((f) => f.endsWith('.js'))) {
  if (readFileSync(`dist/assets/${file}`, 'utf8').includes('docvex-lang')) {
    failed++;
    console.log(`FAIL dist/assets/${file}: still reads docvex-lang`);
  }
}

await server.close();
console.log(failed ? `${failed} failed` : 'all pages ok');
process.exit(failed ? 1 : 0);
