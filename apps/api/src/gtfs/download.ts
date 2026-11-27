import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { GtfsError } from './csv.ts';

export const AT_GTFS_URL = 'https://gtfs.at.govt.nz/gtfs.zip';
export const GTFS_FILES = [
  'routes.txt',
  'stops.txt',
  'trips.txt',
  'calendar.txt',
  'calendar_dates.txt',
  'stop_times.txt',
] as const;
const TIMEOUT_MS = 120_000;

export interface DownloadGtfsOptions {
  dir: string;
  fetch: typeof globalThis.fetch;
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
  url?: string;
}

async function fetchZip(fetch: typeof globalThis.fetch, url: string): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new GtfsError(`GTFS download failed: ${reason}`);
  }
  if (!response.ok) throw new GtfsError(`GTFS download answered HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function unzipWanted(zip: Uint8Array): Record<string, Uint8Array> {
  const wanted: readonly string[] = GTFS_FILES;
  try {
    // The zip also holds shapes.txt, 30 MB unpacked. The filter leaves it packed.
    return unzipSync(zip, { filter: (file) => wanted.includes(file.name) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new GtfsError(`GTFS download is not a zip file: ${reason}`);
  }
}

export async function downloadGtfs(options: DownloadGtfsOptions): Promise<string[]> {
  const { dir, fetch, writeFile, url = AT_GTFS_URL } = options;
  const files = unzipWanted(await fetchZip(fetch, url));
  const missing = GTFS_FILES.filter((name) => files[name] === undefined);
  if (missing.length > 0) throw new GtfsError(`GTFS zip has no ${missing.join(' or ')}`);

  const written: string[] = [];
  for (const name of GTFS_FILES) {
    const path = join(dir, name);
    await writeFile(path, files[name]!);
    written.push(path);
  }
  return written;
}
