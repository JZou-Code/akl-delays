import { readFile } from 'node:fs/promises';
import { composeApi } from './compose.ts';
import { loadConfig } from './config/index.ts';
import type { Schedule } from './poller/index.ts';

function log(line: string): void {
  console.log(`${new Date().toISOString()} ${line}`);
}

const schedule: Schedule = (callback, delayMs) => {
  const timer = setTimeout(() => void callback(), delayMs);
  return () => {
    clearTimeout(timer);
  };
};

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const { app, poller } = await composeApi(config, {
    readText: (path) => readFile(path, 'utf8'),
    fetch: globalThis.fetch,
    now: () => new Date(),
    schedule,
    log,
  });

  const server = app.listen(config.port, (error) => {
    if (error) {
      console.error(`cannot listen on port ${config.port}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    log(`listening on port ${config.port}, feed source ${config.feed.source}`);
    log(
      config.assistant === null ? 'assistant off' : `assistant on, model ${config.assistant.model}`,
    );
    void poller.start();
  });

  const stop = () => {
    log('stopping');
    poller.stop();
    server.close();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
