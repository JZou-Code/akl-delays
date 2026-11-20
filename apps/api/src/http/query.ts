import { DELAY_STATUSES, MODES } from '@akl-delays/shared';
import { z } from 'zod';

const LIMIT_MESSAGE = 'limit must be a whole number above 0';

const delaysQuerySchema = z.object({
  mode: z.enum(MODES, { error: `mode must be one of ${MODES.join(', ')}` }).optional(),
  status: z
    .enum(DELAY_STATUSES, { error: `status must be one of ${DELAY_STATUSES.join(', ')}` })
    .optional(),
  limit: z
    .string({ error: LIMIT_MESSAGE })
    .regex(/^[1-9]\d*$/, LIMIT_MESSAGE)
    .transform(Number)
    .optional(),
});

export type DelaysQuery = z.output<typeof delaysQuerySchema>;

export type QueryResult = { ok: true; query: DelaysQuery } | { ok: false; error: string };

export function parseDelaysQuery(raw: Record<string, unknown>): QueryResult {
  const given = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ''));
  const result = delaysQuerySchema.safeParse(given);
  if (result.success) return { ok: true, query: result.data };
  return { ok: false, error: result.error.issues.map((issue) => issue.message).join('; ') };
}
