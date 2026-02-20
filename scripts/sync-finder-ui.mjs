import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginSrc = path.resolve(__dirname, '..', 'src');
const sharedSrc = path.resolve(__dirname, '..', '..', 'packages', 'finder-ui', 'src');

const files = ['match-finder.tsx', 'styles.css'];

if (!fs.existsSync(sharedSrc)) {
  console.log('[sync-finder-ui] shared package not found; keeping local plugin sources.');
  process.exit(0);
}

for (const rel of files) {
  const from = path.join(sharedSrc, rel);
  const to = path.join(pluginSrc, rel);
  if (!fs.existsSync(from)) {
    console.warn(`[sync-finder-ui] missing source file: ${from}`);
    continue;
  }
  fs.copyFileSync(from, to);
  console.log(`[sync-finder-ui] copied ${rel}`);
}
