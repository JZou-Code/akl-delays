import {
  BOARD_TOOLS,
  CHECK_CASES,
  checkOutcome,
  createAnthropicClient,
  loadFixtureBoard,
  runAsk,
} from './assistant/index.ts';
import { loadConfig } from './config/index.ts';

// Sends the fixed questions to the real model. Each run is billed to the key.
async function main(): Promise<void> {
  const { assistant } = loadConfig(process.env);
  if (assistant === null) throw new Error('ANTHROPIC_API_KEY is not set');
  const client = createAnthropicClient({ apiKey: assistant.apiKey, fetch: globalThis.fetch });
  const board = await loadFixtureBoard(new Date());
  console.log(`model ${assistant.model}, ${CHECK_CASES.length} questions on the fixture\n`);

  let failed = 0;
  const total = { inputTokens: 0, outputTokens: 0 };
  for (const check of CHECK_CASES) {
    const outcome = await runAsk(check.question, {
      client,
      model: assistant.model,
      tools: BOARD_TOOLS,
      board,
    });
    const problems = checkOutcome(check, outcome);
    if (problems.length > 0) failed += 1;
    total.inputTokens += outcome.usage.inputTokens;
    total.outputTokens += outcome.usage.outputTokens;
    const tools = outcome.steps.map((step) => step.tool).join(', ') || 'none';
    console.log(`${problems.length === 0 ? 'PASS' : 'FAIL'}  ${check.question}`);
    console.log(`      tools: ${tools}`);
    console.log(`      answer: ${outcome.answer}`);
    for (const problem of problems) console.log(`      problem: ${problem}`);
    console.log('');
  }
  const passed = CHECK_CASES.length - failed;
  console.log(`${passed} of ${CHECK_CASES.length} passed`);
  console.log(`${total.inputTokens} tokens in, ${total.outputTokens} out`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
