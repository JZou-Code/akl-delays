import { QUESTION_MAX_LENGTH, type AskRequest } from '@akl-delays/shared';
import { z } from 'zod';

const MESSAGE = `question must be text of 1 to ${QUESTION_MAX_LENGTH} characters`;

const askBodySchema = z.object({
  question: z.string({ error: MESSAGE }).trim().min(1, MESSAGE).max(QUESTION_MAX_LENGTH, MESSAGE),
});

export type AskBodyResult = { ok: true; body: AskRequest } | { ok: false; error: string };

export function parseAskBody(raw: unknown): AskBodyResult {
  const result = askBodySchema.safeParse(raw);
  return result.success ? { ok: true, body: result.data } : { ok: false, error: MESSAGE };
}
