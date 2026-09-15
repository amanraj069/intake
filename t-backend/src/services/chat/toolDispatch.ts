import { GeminiFunctionCall, GeminiPart } from '../../lib/gemini/geminiConversation';
import { AppError } from '../../middleware/errorHandler';
import { ChatTool, ChatToolContext, PendingChatAction, ToolOutcome } from './chatToolTypes';
import { ESTIMATE_TOOLS } from './estimateTools';
import { READ_TOOLS } from './readTools';
import { WRITE_TOOLS } from './writeTools';

/** Longest one tool call may run. The turn's remaining budget can cut it shorter. */
export const TOOL_TIMEOUT_MS = 10 * 1000;
const DEFAULT_STATUS_MESSAGE = 'Working on your request...';

const TOOLS: readonly ChatTool[] = [...READ_TOOLS, ...WRITE_TOOLS, ...ESTIMATE_TOOLS];
const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.declaration.name, tool]));

export const FUNCTION_DECLARATIONS = TOOLS.map((tool) => tool.declaration);

export type CallsOutcome = { pendingAction: PendingChatAction } | { responseParts: GeminiPart[] };

/** The status line for a batch of calls, taken from the first tool the model asked for. */
export function statusForCalls(calls: readonly GeminiFunctionCall[]): string {
  const firstTool = calls[0] && TOOLS_BY_NAME.get(calls[0].name);
  return firstTool ? firstTool.statusMessage : DEFAULT_STATUS_MESSAGE;
}

function toolTimeoutError(): AppError {
  return new AppError('Looking up your data took too long. Try again in a moment.', 504, 'CHAT_TOOL_TIMEOUT');
}

/**
 * Runs one tool call under a time limit. A request-level failure the service
 * raises (a 4xx `AppError`, such as a record that does not exist) goes back to
 * the model like a validation error, so it can correct the call or tell the
 * user. Anything else, a timeout or a database outage, fails the whole turn,
 * because no different arguments could fix it.
 */
export async function guardToolCall<TValue>(
  invoke: () => Promise<ToolOutcome<TValue>>,
  timeoutMs: number
): Promise<ToolOutcome<TValue>> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(toolTimeoutError()), Math.max(0, timeoutMs));
  });

  try {
    return await Promise.race([Promise.resolve().then(invoke), timeout]);
  } catch (error) {
    if (error instanceof AppError && error.statusCode < 500) return { ok: false, error: error.message };
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function toFunctionResponsePart(call: GeminiFunctionCall, outcome: ToolOutcome<unknown>): GeminiPart {
  const response = outcome.ok ? { result: outcome.value } : { error: outcome.error };
  return { functionResponse: { id: call.id, name: call.name, response } };
}

function unknownToolOutcome(name: string): ToolOutcome<never> {
  return { ok: false, error: `Unknown tool "${name}". Available tools: ${[...TOOLS_BY_NAME.keys()].join(', ')}` };
}

/**
 * Runs one model turn's calls in order. Reads execute immediately; the first
 * write or estimate that validates ends the turn as a pending action without
 * saving anything. A call that fails validation is reported back like any
 * other tool error, so the model can correct itself or ask the user.
 *
 * @throws AppError CHAT_TOOL_TIMEOUT, or whatever infrastructure failure a tool hit.
 */
export async function executeFunctionCalls(
  calls: readonly GeminiFunctionCall[],
  context: ChatToolContext,
  turnDeadline: number
): Promise<CallsOutcome> {
  const responseParts: GeminiPart[] = [];

  for (const call of calls) {
    const tool = TOOLS_BY_NAME.get(call.name);
    if (!tool) {
      responseParts.push(toFunctionResponsePart(call, unknownToolOutcome(call.name)));
      continue;
    }

    const args = call.args ?? {};
    const timeoutMs = Math.min(TOOL_TIMEOUT_MS, turnDeadline - Date.now());

    if (tool.kind === 'read') {
      responseParts.push(toFunctionResponsePart(call, await guardToolCall(() => tool.run(args, context), timeoutMs)));
      continue;
    }

    const prepared = await guardToolCall(() => tool.prepare(args, context), timeoutMs);
    if (prepared.ok) return { pendingAction: prepared.value };
    responseParts.push(toFunctionResponsePart(call, prepared));
  }

  return { responseParts };
}
