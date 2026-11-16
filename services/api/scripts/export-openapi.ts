import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openapi } from '../src/openapi.js';
const target = process.cwd().endsWith('services/api') ? resolve(process.cwd(),'../../docs/openapi.generated.json') : resolve(process.cwd(),'docs/openapi.generated.json');
await mkdir(resolve(target,'..'),{ recursive: true });
await writeFile(target, JSON.stringify(openapi,null,2)+'\n');
console.log(target);
