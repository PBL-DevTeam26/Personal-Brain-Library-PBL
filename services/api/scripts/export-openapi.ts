import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openapi } from '../src/openapi.js';
import { repositoryRoot } from '../src/paths.js';
const target = resolve(repositoryRoot, 'docs/openapi.generated.json');
await mkdir(resolve(target,'..'),{ recursive: true });
await writeFile(target, JSON.stringify(openapi,null,2)+'\n');
console.log(target);
