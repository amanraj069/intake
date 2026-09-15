import { AppError } from '../middleware/errorHandler';
import { toAiAppError } from '../lib/gemini/aiFailure';
import {
  ConversationTurnGenerator,
  GeminiContent,
  functionCallsIn,
  generateConversationTurnStream,
  textIn,
} from '../lib/gemini/geminiConversation';
import { InlineImage } from '../lib/gemini/geminiClient';
import { GeminiUnavailableError } from '../lib/gemini/geminiErrors';
import { buildChatSystemInstruction } from '../lib/chatPrompt';
import { toPlainChatText } from '../lib/chatReplyText';
import { ChatToolContext, PendingChatAction } from './chat/chatToolTypes';
import { ChatHistoryTurn, toConversationContents } from './chat/conversationContents';
import { FUNCTION_DECLARATIONS, executeFunctionCalls, statusForCalls } from './chat/toolDispatch';

/**
 * The conversational loop: history in, one visible reply (and at most one
 * pending write) out. It drives Gemini's native function calling with a plain
 * bounded loop instead of an agent framework: the tools are flat, with no
 * branching between steps, so a framework would hide the control flow without
 * adding capability.
 */

/** Model calls per user message, so a model that keeps calling tools cannot spin forever. */
export const MAX_AGENT_ITERATIONS = 5;
const ATTEMPT_TIMEOUT_MS = 20 * 1000;
/** Caps the whole turn, across every model call and tool run in it. */
const TURN_BUDGET_MS = 60 * 1000;

const CHAT_FAILURE_COPY = {
  logLabel: 'ChatAgent',
  unavailableMessage: 'The assistant is unavailable right now. Try again in a minute.',
  rejectedMessage: 'The assistant could not process that message. Try rephrasing it.',
  rejectedCode: 'CHAT_REJECTED',
};

export interface ChatTurnCallbacks {
  onTextDelta?: (delta: string) => void;
  onStatus?: (status: string) => void;
}

export interface ChatTurnResult {
  reply: string;
  pendingAction: PendingChatAction | null;
}

export interface RunChatTurnOptions {
  history: readonly ChatHistoryTurn[];
  /** Empty when the user sent only a photo. */
  message: string;
  image?: InlineImage;
  context: ChatToolContext;
  /** Defaults to the live Gemini call; tests pass a scripted model. */
  generateTurn?: ConversationTurnGenerator;
  callbacks?: ChatTurnCallbacks;
}

async function requestModelTurn(
  generateTurn: ConversationTurnGenerator,
  contents: readonly GeminiContent[],
  context: ChatToolContext,
  turnDeadline: number,
  callbacks?: ChatTurnCallbacks
): Promise<GeminiContent> {
  const remainingBudgetMs = turnDeadline - Date.now();

  try {
    if (remainingBudgetMs <= 0) {
      throw new GeminiUnavailableError('The chat turn ran out of time between tool calls');
    }
    return await generateTurn(
      {
        systemInstruction: buildChatSystemInstruction(context),
        contents,
        functionDeclarations: FUNCTION_DECLARATIONS,
        attemptTimeoutMs: Math.min(ATTEMPT_TIMEOUT_MS, remainingBudgetMs),
        totalBudgetMs: remainingBudgetMs,
      },
      { onTextDelta: callbacks?.onTextDelta }
    );
  } catch (cause) {
    throw toAiAppError(cause, CHAT_FAILURE_COPY);
  }
}

function finalReply(modelTurn: GeminiContent): ChatTurnResult {
  const reply = toPlainChatText(textIn(modelTurn));

  if (!reply) {
    console.warn('[ChatAgent] Model ended the turn with no text:', JSON.stringify(modelTurn.parts));
    throw new AppError('The assistant returned an empty reply. Try sending that again.', 502, 'AI_BAD_RESPONSE');
  }

  return { reply, pendingAction: null };
}

/**
 * Produces the assistant's reply to one user message, calling read tools as
 * the model asks for them. Never writes: a write the model proposes, or a
 * nutrition estimate it produces, comes back as `pendingAction`, with its
 * preview as the reply.
 *
 * @throws AppError AI_UNAVAILABLE, CHAT_REJECTED, AI_BAD_RESPONSE, CHAT_TOOL_TIMEOUT or CHAT_STEP_LIMIT.
 */
export async function runChatTurn({
  history,
  message,
  image,
  context,
  generateTurn = generateConversationTurnStream,
  callbacks,
}: RunChatTurnOptions): Promise<ChatTurnResult> {
  const contents = toConversationContents(history, message, image);
  const turnDeadline = Date.now() + TURN_BUDGET_MS;
  const requestedTools: string[] = [];

  for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration += 1) {
    const modelTurn = await requestModelTurn(generateTurn, contents, context, turnDeadline, callbacks);
    const calls = functionCallsIn(modelTurn);
    if (calls.length === 0) return finalReply(modelTurn);

    requestedTools.push(...calls.map((call) => call.name));
    callbacks?.onStatus?.(statusForCalls(calls));

    const outcome = await executeFunctionCalls(calls, context, turnDeadline);
    if ('pendingAction' in outcome) {
      callbacks?.onTextDelta?.(outcome.pendingAction.preview);
      return { reply: outcome.pendingAction.preview, pendingAction: outcome.pendingAction };
    }

    // The model's own turn is replayed as sent, thought signatures included, before the tool results.
    contents.push(modelTurn, { role: 'user', parts: outcome.responseParts });
  }

  console.warn(
    `[ChatAgent] No final answer after ${MAX_AGENT_ITERATIONS} model calls. Tools requested: ${requestedTools.join(', ')}`
  );
  throw new AppError(
    'The assistant could not finish answering that. Try asking in a simpler way.',
    502,
    'CHAT_STEP_LIMIT'
  );
}
