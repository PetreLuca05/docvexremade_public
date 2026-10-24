// Writes supabase/functions/ask-docvex/knowledge.ts from knowledge.md (the
// website assistant's knowledge base), so the function bundles it. Run after
// editing knowledge.md, before deploying the function.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../supabase/functions/ask-docvex/', import.meta.url);
const md = readFileSync(new URL('knowledge.md', dir), 'utf8');
writeFileSync(
  new URL('knowledge.ts', dir),
  `// Generated from knowledge.md by scripts/knowledge.mjs; do not edit.\nexport default ${JSON.stringify(md)};\n`,
);
console.log(`knowledge.ts: ${md.length} characters`);
