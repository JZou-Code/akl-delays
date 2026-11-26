import type Anthropic from '@anthropic-ai/sdk';
import {
  DELAY_STATUSES,
  MODES,
  SORT_KEYS,
  SORT_ORDERS,
  type FeedSourceName,
  type ServiceDelay,
} from '@akl-delays/shared';
import { z } from 'zod';
import { selectServices, summariseModes } from '../delays/index.ts';
import type { Snapshot } from '../store/index.ts';

// One tool result holds at most this many services, so a question cannot pull the whole snapshot into the prompt.
export const MAX_SERVICES = 20;
const DEFAULT_SERVICES = 10;

export interface BoardView {
  snapshot: Snapshot;
  stale: boolean;
  feedSource: FeedSourceName;
}

export type ToolCall =
  { ok: true; result: unknown; summary: string } | { ok: false; error: string };

export interface AssistantTool {
  definition: Anthropic.Tool;
  call: (input: unknown, board: BoardView) => ToolCall;
}

interface ToolSpec<S extends z.ZodType> {
  name: string;
  description: string;
  input: S;
  run: (input: z.output<S>, board: BoardView) => { result: unknown; summary: string };
}

function defineTool<S extends z.ZodType>(spec: ToolSpec<S>): AssistantTool {
  const { properties = {}, required = [] } = z.toJSONSchema(spec.input);
  return {
    definition: {
      name: spec.name,
      description: spec.description,
      input_schema: { type: 'object', properties, required, additionalProperties: false },
    },
    call: (input, board) => {
      const parsed = spec.input.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join('; ') };
      }
      return { ok: true, ...spec.run(parsed.data, board) };
    },
  };
}

function routeLabel(service: ServiceDelay): string {
  return service.routeName ?? service.routeId;
}

// The feed gives a cancelled trip a delay of 0, which would read as on time.
function delayMinutes({ status, delaySeconds }: ServiceDelay): number | null {
  if (status === 'cancelled' || delaySeconds === null) return null;
  return Math.round(delaySeconds / 60);
}

function brief(service: ServiceDelay) {
  return {
    route: routeLabel(service),
    mode: service.mode,
    status: service.status,
    delayMinutes: delayMinutes(service),
    stop: service.stopName,
  };
}

function counted(shown: number, total: number): string {
  const noun = total === 1 ? 'service' : 'services';
  return shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`;
}

const getSummary = defineTool({
  name: 'get_summary',
  description:
    'Counts of running services for each mode (bus, train, ferry) by status, with the time of the feed and whether the data is stale. Use it for questions about a whole mode or the whole network.',
  input: z.strictObject({}),
  run: (_input, { snapshot, stale, feedSource }) => {
    const modes = summariseModes(snapshot.services);
    const total = MODES.reduce((sum, mode) => sum + modes[mode].total, 0);
    return {
      result: { feedTimestamp: snapshot.feedTimestamp, feedSource, stale, modes },
      summary: counted(total, total),
    };
  },
});

const listDelays = defineTool({
  name: 'list_delays',
  description: `Running services, filtered and sorted. Returns the number that match and at most ${MAX_SERVICES} of them. delayMinutes above 0 is late, below 0 is early, null is unknown. With no input it returns the ${DEFAULT_SERVICES} latest services.`,
  input: z.strictObject({
    mode: z.enum(MODES).optional().describe('Only this mode'),
    status: z.enum(DELAY_STATUSES).optional().describe('Only this status'),
    q: z.string().max(50).optional().describe('Text that the route name or the stop name contains'),
    sort: z.enum(SORT_KEYS).optional().describe('Column to sort by. The default is delay.'),
    order: z.enum(SORT_ORDERS).optional().describe('The default is desc, latest first.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_SERVICES)
      .optional()
      .describe(`How many services to return. The default is ${DEFAULT_SERVICES}.`),
  }),
  run: (input, { snapshot }) => {
    const page = selectServices(snapshot.services, {
      ...input,
      limit: input.limit ?? DEFAULT_SERVICES,
    });
    return {
      result: { total: page.total, services: page.services.map(brief) },
      summary: counted(page.services.length, page.total),
    };
  },
});

const getRoute = defineTool({
  name: 'get_route',
  description: `The running services on one route, latest first, at most ${MAX_SERVICES}. Name the route the way a rider does, such as 70 or NX1.`,
  input: z.strictObject({
    route: z.string().min(1).max(50).describe('The route name, such as 70, NX1 or EAST'),
  }),
  run: ({ route }, { snapshot }) => {
    const wanted = route.trim().toLowerCase();
    const onRoute = snapshot.services.filter(
      (service) => routeLabel(service).toLowerCase() === wanted,
    );
    const page = selectServices(onRoute, { limit: MAX_SERVICES });
    const first = page.services[0];
    if (first === undefined) {
      return {
        result: { route, total: 0, note: 'No service on a route with this name is running now.' },
        summary: 'no running services',
      };
    }
    return {
      result: {
        route: routeLabel(first),
        mode: first.mode,
        total: page.total,
        services: page.services.map(brief),
      },
      summary: counted(page.services.length, page.total),
    };
  },
});

export const BOARD_TOOLS: readonly AssistantTool[] = [getSummary, listDelays, getRoute];
