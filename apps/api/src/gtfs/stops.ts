import { z } from 'zod';
import { parseRows } from './csv.ts';

export interface Stop {
  stopId: string;
  name: string | null;
  // The number on the stop's pole, such as 7136.
  code: string | null;
}

const stopRowSchema = z.object({
  stop_id: z.string({ error: 'stop_id is missing' }).min(1, 'stop_id is empty'),
  stop_name: z.string().optional(),
  stop_code: z.string().optional(),
});

export function parseStops(text: string): Map<string, Stop> {
  const rows = parseRows(text, 'stops.txt', stopRowSchema);
  return new Map(
    rows.map((row) => [
      row.stop_id,
      { stopId: row.stop_id, name: row.stop_name || null, code: row.stop_code || null },
    ]),
  );
}
