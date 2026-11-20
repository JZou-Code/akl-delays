import { z } from 'zod';
import { FeedError } from './errors.ts';

const posixSeconds = z.number().int().nonnegative();

const headerSchema = z.object({
  timestamp: posixSeconds,
  gtfs_realtime_version: z.string(),
  incrementality: z.union([z.string(), z.number()]).optional(),
});

const feedSchema = z.object({
  status: z.literal('OK'),
  response: z.object({
    header: headerSchema,
    // An empty GTFS Realtime feed in JSON may leave out the entity list.
    entity: z.array(z.unknown()).default([]),
  }),
});

export type Feed = z.output<typeof feedSchema>['response'];

const MAX_ISSUES_SHOWN = 3;

function describeIssues(issues: z.ZodError['issues']): string {
  const shown = issues
    .slice(0, MAX_ISSUES_SHOWN)
    .map((issue) => `${issue.path.map(String).join('.') || 'body'}: ${issue.message}`);
  const hidden = issues.length - shown.length;
  return hidden > 0 ? `${shown.join('; ')}; and ${hidden} more` : shown.join('; ');
}

export function parseFeed(body: unknown): Feed {
  const result = feedSchema.safeParse(body);
  if (!result.success) {
    throw new FeedError(`feed does not match the schema: ${describeIssues(result.error.issues)}`);
  }
  return result.data.response;
}
