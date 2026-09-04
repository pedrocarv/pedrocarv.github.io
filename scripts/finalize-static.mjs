import { readdir, mkdir, rename, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

// Keep /publications/ and existing publication permalinks compatible with
// GitHub Pages, which serves directory indexes rather than extensionless HTML.
const output = 'dist/client';
async function directoryIndexes(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) {
      await directoryIndexes(source);
    } else if (entry.name.endsWith('.html') && !['index.html', '404.html'].includes(entry.name)) {
      const destination = source.slice(0, -5);
      await mkdir(destination, { recursive: true });
      await rename(source, join(destination, 'index.html'));
    }
  }
}
await directoryIndexes(output);
await copyFile('public/.nojekyll', join(output, '.nojekyll'));
console.log('Static directory indexes prepared for GitHub Pages.');
