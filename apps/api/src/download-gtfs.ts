import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { downloadGtfs } from './gtfs/index.ts';

const dir = fileURLToPath(new URL('../data/gtfs', import.meta.url));

async function main(): Promise<void> {
  await mkdir(dir, { recursive: true });
  const paths = await downloadGtfs({ dir, fetch: globalThis.fetch, writeFile });
  for (const path of paths) console.log(`wrote ${path}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
