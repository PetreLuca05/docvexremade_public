import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Each page keeps its own HTML file (and URL), so the site stays a multi-page
// build: no client-side router and no 404 redirect trick on GitHub Pages.
const pages = [
  'index',
  'instalare',
  'confidentialitate',
  'cookies',
  'termeni',
  'informatii-legale',
  '404',
];

const REPO = 'PetreLuca05/docvexremade_public';

// The published versions, read from this repository's GitHub Releases when the
// site is built (the deploy workflow rebuilds on every new release), so the
// download page needs no request to GitHub until the visitor clicks download.
async function fetchReleases() {
  const headers = { Accept: 'application/vnd.github.html+json', 'User-Agent': 'docvex-site' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, {
      headers,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const list = await res.json();
    return list
      .filter((r) => !r.draft)
      .map((r) => {
        const exe =
          r.assets.find((a) => /-setup\.exe$/i.test(a.name)) ??
          r.assets.find((a) => /\.exe$/i.test(a.name));
        return (
          exe && {
            version: r.tag_name.replace(/^v/, ''),
            date: r.published_at,
            prerelease: r.prerelease,
            notes: r.body_html ?? '',
            file: exe.name,
            size: exe.size,
            url: exe.browser_download_url,
          }
        );
      })
      .filter(Boolean);
  } catch (error) {
    // A deploy must not publish a download page with no downloads.
    if (process.env.CI) throw new Error(`Could not read the releases: ${error.message}`);
    console.warn(`[releases] ${error.message}; the download page will list no versions.`);
    return [];
  }
}

function releases() {
  const id = 'virtual:releases';
  let data;
  return {
    name: 'docvex-releases',
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    async load(source) {
      if (source !== `\0${id}`) return;
      data ??= await fetchReleases();
      return `export default ${JSON.stringify(data)};`;
    },
  };
}

export default defineConfig({
  // Served from the root of the custom domain in public/CNAME.
  base: '/',
  plugins: [react(), releases()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)])),
    },
  },
});
