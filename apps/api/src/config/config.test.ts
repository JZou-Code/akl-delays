import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config.ts';

describe('loadConfig', () => {
  it('uses the defaults when nothing is set', () => {
    const config = loadConfig({});

    expect(config.port).toBe(3000);
    expect(config.feed).toEqual({ source: 'fixture' });
    expect(config.assistant).toBeNull();
    expect(config.pollIntervalSeconds).toBe(60);
    expect(config.maxUpdateAgeSeconds).toBe(1200);
    expect(config.gtfsDir.endsWith(join('apps', 'api', 'fixtures', 'gtfs'))).toBe(true);
  });

  it('reads every variable', () => {
    const config = loadConfig({
      PORT: '8080',
      FEED_SOURCE: 'at',
      AT_API_KEY: 'test-key',
      POLL_INTERVAL_SECONDS: '120',
      MAX_UPDATE_AGE_SECONDS: '600',
      GTFS_DIR: '/data/gtfs',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      ASSISTANT_MODEL: 'claude-sonnet-5-5',
      ASSISTANT_QUESTIONS_PER_HOUR: '5',
    });

    expect(config).toEqual({
      port: 8080,
      feed: { source: 'at', apiKey: 'test-key' },
      assistant: { apiKey: 'test-anthropic-key', model: 'claude-sonnet-5-5', questionsPerHour: 5 },
      pollIntervalSeconds: 120,
      maxUpdateAgeSeconds: 600,
      gtfsDir: '/data/gtfs',
    });
  });

  it('treats an empty value as unset', () => {
    const config = loadConfig({ PORT: '', FEED_SOURCE: '', AT_API_KEY: '', GTFS_DIR: '' });

    expect(config.port).toBe(3000);
    expect(config.feed).toEqual({ source: 'fixture' });
  });

  it('turns the assistant on with its defaults when only the key is set', () => {
    expect(loadConfig({ ANTHROPIC_API_KEY: 'test-anthropic-key' }).assistant).toEqual({
      apiKey: 'test-anthropic-key',
      model: 'claude-haiku-5-5',
      questionsPerHour: 20,
    });
  });

  it('leaves the assistant off when the key is empty', () => {
    const config = loadConfig({ ANTHROPIC_API_KEY: '', ASSISTANT_MODEL: 'claude-sonnet-5-5' });

    expect(config.assistant).toBeNull();
  });

  it.each(['0', '1001', 'many'])('rejects ASSISTANT_QUESTIONS_PER_HOUR=%s', (value) => {
    expect(() => loadConfig({ ASSISTANT_QUESTIONS_PER_HOUR: value })).toThrow(
      new ConfigError('ASSISTANT_QUESTIONS_PER_HOUR must be a whole number from 1 to 1000'),
    );
  });

  it('ignores variables it does not know', () => {
    expect(() => loadConfig({ HOME: '/home/someone' })).not.toThrow();
  });

  it.each(['abc', '0', '65536', '30.5', '-1'])('rejects PORT=%s', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow(
      new ConfigError('PORT must be a whole number from 1 to 65535'),
    );
  });

  it('rejects an unknown FEED_SOURCE', () => {
    expect(() => loadConfig({ FEED_SOURCE: 'live' })).toThrow('FEED_SOURCE must be fixture or at');
  });

  it('requires AT_API_KEY when FEED_SOURCE=at', () => {
    expect(() => loadConfig({ FEED_SOURCE: 'at' })).toThrow(
      'AT_API_KEY is required when FEED_SOURCE=at',
    );
  });

  it.each(['0', 'fast', '86401'])('rejects POLL_INTERVAL_SECONDS=%s', (interval) => {
    expect(() => loadConfig({ POLL_INTERVAL_SECONDS: interval })).toThrow(
      'POLL_INTERVAL_SECONDS must be a whole number from 1 to 86400',
    );
  });

  it.each(['0', 'old', '86401'])('rejects MAX_UPDATE_AGE_SECONDS=%s', (age) => {
    expect(() => loadConfig({ MAX_UPDATE_AGE_SECONDS: age })).toThrow(
      'MAX_UPDATE_AGE_SECONDS must be a whole number from 1 to 86400',
    );
  });

  it('lists every problem in one error', () => {
    expect(() => loadConfig({ PORT: 'x', FEED_SOURCE: 'y' })).toThrow(
      'PORT must be a whole number from 1 to 65535; FEED_SOURCE must be fixture or at',
    );
  });

  it('keeps the key out of the error message', () => {
    let message = '';
    try {
      loadConfig({ FEED_SOURCE: 'at', AT_API_KEY: 'secret-value', PORT: 'secret-value' });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }

    expect(message).toBe('PORT must be a whole number from 1 to 65535');
  });
});
