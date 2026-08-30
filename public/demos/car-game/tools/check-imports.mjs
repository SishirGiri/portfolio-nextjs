// Verifies every <script> in the game's index.html and the whole relative
// import graph beneath each entry resolves to a real file on disk.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(GAME, 'index.html'), 'utf8');
const bad = [];
const seen = new Set();
const queue = [];

for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
  if (m[1].startsWith('http') || m[1].startsWith('/audio')) continue;
  queue.push(resolve(GAME, m[1].replace(/^\//, '')));
}
if (!queue.length) bad.push('no local scripts found in index.html');

while (queue.length) {
  const f = queue.shift().replace(/\\/g, '/');
  if (seen.has(f)) continue;
  seen.add(f);
  if (!existsSync(f) || !statSync(f).isFile()) { bad.push('MISSING ' + f); continue; }
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?:from|import)\s+["'](\.[^"']+)["']/g)) {
    const base = resolve(dirname(f), m[1]).replace(/\\/g, '/');
    const hit = [base, base + '.js', base + '/index.js', base + '.json']
      .find(c => existsSync(c) && statSync(c).isFile());
    if (!hit) bad.push(`UNRESOLVED ${f} -> ${m[1]}`);
    else queue.push(hit);
  }
}
console.log(`entry scripts + imports checked: ${seen.size} files`);
console.log(bad.length ? bad.join('\n') : 'module graph OK');
process.exit(bad.length ? 1 : 0);
