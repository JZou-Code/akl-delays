import type { AskOutcome } from './loop.ts';

// A fixed question for the recorded fixture, with what a right answer has to hold.
export interface CheckCase {
  question: string;
  // At least one of these tools has to be called. Empty means any or none.
  tools: readonly string[];
  // Every pattern has to match the answer.
  answer: readonly RegExp[];
}

export const MAX_ANSWER_WORDS = 100;

const RECORDING = /record|sample|not live/i;
const CANNOT =
  /cannot|can't|can not|unable|not able|no (history|forecast|timetable)|only (shows?|holds?|has)/i;

export const CHECK_CASES: readonly CheckCase[] = [
  {
    question: 'Which bus routes are running latest right now?',
    tools: ['list_delays'],
    answer: [/\b373\b/, RECORDING],
  },
  {
    question: 'Are the trains on time?',
    tools: ['get_summary', 'list_delays'],
    answer: [/on time/i, RECORDING],
  },
  {
    question: 'Is anything cancelled?',
    tools: ['get_summary', 'list_delays'],
    answer: [/cancel/i, /\b(2|two)\b/i, RECORDING],
  },
  {
    question: 'How late is the 373?',
    tools: ['get_route', 'list_delays'],
    answer: [/\b46\b/, RECORDING],
  },
  {
    question: 'How are the ferries doing?',
    tools: ['get_summary', 'list_delays'],
    answer: [/ferr/i, /late/i, RECORDING],
  },
  {
    question: 'Is route 999X running?',
    tools: ['get_route', 'list_delays'],
    answer: [/\b(no|not)\b/i],
  },
  { question: 'Will the 70 be late tomorrow?', tools: [], answer: [CANNOT] },
  { question: 'Was the 83 late yesterday?', tools: [], answer: [CANNOT] },
];

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => word !== '').length;
}

// Returns what is wrong with the outcome. An empty list is a pass.
export function checkOutcome(check: CheckCase, outcome: AskOutcome): string[] {
  const problems: string[] = [];
  const called = outcome.steps.map((step) => step.tool);
  if (check.tools.length > 0 && !check.tools.some((tool) => called.includes(tool))) {
    problems.push(`called ${called.join(', ') || 'no tool'}, expected ${check.tools.join(' or ')}`);
  }
  for (const pattern of check.answer) {
    if (!pattern.test(outcome.answer)) problems.push(`answer does not match ${String(pattern)}`);
  }
  const words = wordCount(outcome.answer);
  if (words > MAX_ANSWER_WORDS) problems.push(`answer has ${words} words`);
  if (/[*#`]|^\s*(?:-|\d+[.)])\s/m.test(outcome.answer)) problems.push('answer has markdown');
  return problems;
}
