import type { Mode } from '@akl-delays/shared';
import { z } from 'zod';
import { parseRows } from './csv.ts';

export interface Route {
  routeId: string;
  name: string | null;
  mode: Mode | null;
}

const MODE_BY_ROUTE_TYPE: Readonly<Record<number, Mode>> = { 2: 'train', 3: 'bus', 4: 'ferry' };

export function modeFromRouteType(routeType: number): Mode | null {
  return MODE_BY_ROUTE_TYPE[routeType] ?? null;
}

const routeRowSchema = z.object({
  route_id: z.string({ error: 'route_id is missing' }).min(1, 'route_id is empty'),
  route_short_name: z.string().optional(),
  route_long_name: z.string().optional(),
  route_type: z
    .string({ error: 'route_type is missing' })
    .regex(/^\d+$/, 'route_type must be a whole number')
    .transform(Number),
});

export function parseRoutes(text: string): Map<string, Route> {
  const rows = parseRows(text, 'routes.txt', routeRowSchema);
  return new Map(
    rows.map((row) => [
      row.route_id,
      {
        routeId: row.route_id,
        name: row.route_short_name || row.route_long_name || null,
        mode: modeFromRouteType(row.route_type),
      },
    ]),
  );
}
