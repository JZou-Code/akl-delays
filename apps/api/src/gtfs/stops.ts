import { z } from 'zod';
import { parseRows } from './csv.ts';

export interface Stop {
  stopId: string;
  name: string | null;
}

const stopRowSchema = z.object({
  stop_id: z.string({ error: 'stop_id is missing' }).min(1, 'stop_id is empty'),
  stop_name: z.string().optional(),
});

export function parseStops(text: string): Map<string, Stop> {
  const rows = parseRows(text, 'stops.txt', stopRowSchema);
  return new Map(
    rows.map((row) => [row.stop_id, { stopId: row.stop_id, name: row.stop_name || null }]),
  );
}
