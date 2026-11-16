import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Source files live in src/; compiled files live in dist/src/.
const apiRoot = fileURLToPath(new URL(
  existsSync(new URL('../package.json', import.meta.url)) ? '../' : '../../',
  import.meta.url,
));
export const repositoryRoot = resolve(apiRoot, '../..');
