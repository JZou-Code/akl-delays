import type Anthropic from '@anthropic-ai/sdk';
import type { AskStep, AskUsage } from '@akl-delays/shared';
import { SYSTEM_PROMPT, questionMessage } from './prompt.ts';
import type { AssistantTool, BoardView } from './tools.ts';

export const MAX_MODEL_CALLS = 5;
// Thinking counts against this limit, so a small value can run out before the answer starts.
export const MAX_TOKENS = 16000;
export const CANNOT_ANSWER = 'This question could not be answered. Try asking it another way.';

export type ModelRequest = Anthropic.MessageCreateParamsNonStreaming;

export interface ModelReply {
  content: Anthropic.ContentBlock[];
  stop_reason: Anthropic.StopReason | null;
  usage: Pick<Anthropic.Usage, 'input_tokens' | 'output_tokens'>;
}

export interface ModelClient {
  create: (request: ModelRequest) => Promise<ModelReply>;
}

export class AssistantError extends Error {
  override name = 'AssistantError';
}

export interface AskDeps {
  client: ModelClient;
  model: string;
  tools: readonly AssistantTool[];
  board: BoardView;
}

export interface AskOutcome {
  answer: string;
  steps: AskStep[];
  usage: AskUsage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finalAnswer(reply: ModelReply): string {
  if (reply.stop_reason !== 'end_turn') return CANNOT_ANSWER;
  const text = reply.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
  return text === '' ? CANNOT_ANSWER : text;
}

interface Ran {
  step: AskStep;
  result: Anthropic.ToolResultBlockParam;
}

function runTool(
  block: Anthropic.ToolUseBlock,
  tools: readonly AssistantTool[],
  board: BoardView,
): Ran {
  const input = isRecord(block.input) ? block.input : {};
  const tool = tools.find((candidate) => candidate.definition.name === block.name);
  const outcome = tool?.call(block.input, board) ?? { ok: false, error: 'no tool has this name' };
  if (!outcome.ok) {
    return {
      step: { tool: block.name, input, summary: `refused: ${outcome.error}` },
      result: {
        type: 'tool_result',
        tool_use_id: block.id,
        is_error: true,
        content: outcome.error,
      },
    };
  }
  return {
    step: { tool: block.name, input, summary: outcome.summary },
    result: {
      type: 'tool_result',
      tool_use_id: block.id,
      content: JSON.stringify(outcome.result),
    },
  };
}

export async function runAsk(question: string, deps: AskDeps): Promise<AskOutcome> {
  const { client, model, tools, board } = deps;
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: questionMessage(question, board) },
  ];
  const steps: AskStep[] = [];
  const usage: AskUsage = { inputTokens: 0, outputTokens: 0 };

  for (let call = 0; call < MAX_MODEL_CALLS; call += 1) {
    const reply = await client.create({
      model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: tools.map((tool) => tool.definition),
      output_config: { effort: 'low' },
      messages,
    });
    usage.inputTokens += reply.usage.input_tokens;
    usage.outputTokens += reply.usage.output_tokens;
    if (reply.stop_reason !== 'tool_use') return { answer: finalAnswer(reply), steps, usage };

    const ran = reply.content
      .filter((block) => block.type === 'tool_use')
      .map((block) => runTool(block, tools, board));
    steps.push(...ran.map(({ step }) => step));
    // The whole reply goes back as it came. The API needs the thinking blocks next to the tool calls they led to.
    messages.push({ role: 'assistant', content: reply.content });
    messages.push({ role: 'user', content: ran.map(({ result }) => result) });
  }
  throw new AssistantError(`the model did not finish within ${MAX_MODEL_CALLS} calls`);
}
