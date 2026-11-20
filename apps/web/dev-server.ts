import { z } from 'zod';

export const DEFAULT_API_PORT = 3000;

export type Env = Readonly<Record<string, string | undefined>>;

const PORT_MESSAGE = 'PORT must be a whole number from 1 to 65535';

const portSchema = z
  .string()
  .regex(/^\d+$/, PORT_MESSAGE)
  .transform(Number)
  .refine((port) => port >= 1 && port <= 65535, PORT_MESSAGE);

export function apiProxyTarget(env: Env): string {
  const raw = env.PORT;
  if (raw === undefined || raw === '') return `http://localhost:${DEFAULT_API_PORT}`;
  const result = portSchema.safeParse(raw);
  if (!result.success) throw new Error(PORT_MESSAGE);
  return `http://localhost:${result.data}`;
}
