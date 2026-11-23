import { DELAY_STATUSES, MODES, SORT_KEYS, SORT_ORDERS } from '@akl-delays/shared';
import { z } from 'zod';

const LIMIT_MESSAGE = 'limit must be a whole number above 0';
const Q_MAX_LENGTH = 50;
const Q_MESSAGE = `q must be text of at most ${Q_MAX_LENGTH} characters`;

const delaysQuerySchema = z.object({
  mode: z.enum(MODES, { error: `mode must be one of ${MODES.join(', ')}` }).optional(),
  status: z
    .enum(DELAY_STATUSES, { error: `status must be one of ${DELAY_STATUSES.join(', ')}` })
    .optional(),
  q: z.string({ error: Q_MESSAGE }).max(Q_MAX_LENGTH, Q_MESSAGE).optional(),
  sort: z.enum(SORT_KEYS, { error: `sort must be one of ${SORT_KEYS.join(', ')}` }).optional(),
  order: z
    .enum(SORT_ORDERS, { error: `order must be one of ${SORT_ORDERS.join(', ')}` })
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
