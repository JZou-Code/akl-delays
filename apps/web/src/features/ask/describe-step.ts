import type { AskStep } from '@akl-delays/shared';

const MODE_NOUNS: Record<string, string> = { bus: 'buses', train: 'trains', ferry: 'ferries' };

const STATUS_WORDS: Record<string, string> = {
  early: 'early',
  on_time: 'on-time',
  late: 'late',
  very_late: 'very late',
  cancelled: 'cancelled',
};

const SORT_WORDS: Record<string, string> = {
  route: 'route',
  mode: 'mode',
  status: 'status',
  stop: 'stop',
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function sortPhrase(sort: string | null, order: string | null): string | null {
  if (sort === null && order === null) return null;
  if (sort === null || sort === 'delay')
    return order === 'asc' ? 'least delayed first' : 'most delayed first';
  return `sorted by ${SORT_WORDS[sort] ?? sort}`;
}

function listPhrase(input: AskStep['input']): string {
  const mode = text(input.mode);
  const status = text(input.status);
  const q = text(input.q);
  const noun = (mode === null ? null : MODE_NOUNS[mode]) ?? 'services';
  const subject =
    status === 'unknown'
      ? `${noun} with no data`
      : status === null
        ? noun
        : `${STATUS_WORDS[status] ?? status} ${noun}`;
  const matching = q === null ? '' : ` matching "${q}"`;
  const sorted = sortPhrase(text(input.sort), text(input.order));
  return `Looked at ${subject}${matching}${sorted === null ? '' : `, ${sorted}`}`;
}

// Says what a tool call did in a rider's words. An unknown tool keeps its name.
export function describeStep({ tool, input }: AskStep): string {
  if (tool === 'get_summary') return 'Counted the services on the board';
  if (tool === 'list_delays') return listPhrase(input);
  if (tool === 'get_route') return `Looked up route ${text(input.route) ?? 'with no name'}`;
  return tool;
}
