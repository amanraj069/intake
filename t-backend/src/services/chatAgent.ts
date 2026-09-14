import { AppError } from '../middleware/errorHandler';
import { toAiAppError } from '../lib/gemini/aiFailure';
import {
  ConversationTurnGenerator,
  GeminiContent,
  GeminiFunctionCall,
  GeminiPart,
  functionCallsIn,
  generateConversationTurn,
  textIn,
} from '../lib/gemini/geminiConversation';
import { InlineImage } from '../lib/gemini/geminiClient';
import { GeminiUnavailableError } from '../lib/gemini/geminiErrors';
import { buildChatSystemInstruction } from '../lib/chatPrompt';
import { toPlainChatText } from '../lib/chatReplyText';
import { ChatActionStatus, ChatRole } from '../models/ChatMessage';
import { ChatTool, ChatToolContext, PendingChatAction, ToolOutcome } from './chat/chatToolTypes';
import { ESTIMATE_TOOLS } from './chat/estimateTools';
import { READ_TOOLS } from './chat/readTools';
import { WRITE_TOOLS } from './chat/writeTools';

/**
 * The whole conversational loop lives in this file: history in, one visible
 * reply (and at most one pending write) out. It talks to Gemini's native
 * function calling directly; the tool set is small and flat, so an agent
 * framework would add weight without adding capability.
 */

/** Model calls per user message, so a model that keeps calling tools cannot spin forever. */
export const MAX_AGENT_ITERATIONS = 5;
const ATTEMPT_TIMEOUT_MS = 20 * 1000;
/** Caps the whole turn, across every model call and tool run in it. */
const TURN_BUDGET_MS = 60 * 1000;

const TOOLS: readonly ChatTool[] = [...READ_TOOLS, ...WRITE_TOOLS, ...ESTIMATE_TOOLS];
const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.declaration.name, tool]));
const FUNCTION_DECLARATIONS = TOOLS.map((tool) => tool.declaration);

const CHAT_FAILURE_COPY = {
  logLabel: 'ChatAgent',
  unavailableMessage: 'The assistant is unavailable right now. Try again in a minute.',
  rejectedMessage: 'The assistant could not process that message. Try rephrasing it.',
  rejectedCode: 'CHAT_REJECTED',
};

export interface ChatHistoryTurn {
  role: ChatRole;
  content: string;
  /** Earlier photos are not re-sent, so the model is only told one was there. */
  hadImage?: boolean;
  /** Set on a reply that proposed a change, so the model knows whether that change was saved. */
  actionStatus?: ChatActionStatus;
}

/**
 * A proposal's stored text reads the same whether or not it was saved, so its
 * outcome is spelled out for the model. Without it, the model could tell the
 * user a meal is logged when they never confirmed it, or propose it again.
 */
const ACTION_OUTCOME_NOTES: Record<ChatActionStatus, string> = {
  pending: '(Not saved: the user did not confirm this change.)',
  confirmed: '(Saved: the user confirmed this change.)',
  estimate: '(Not saved: this only answered a nutrition question.)',
};

const EARLIER_PHOTO_NOTE = '(The user attached a food photo to this message.)';
const PHOTO_WITHOUT_CAPTION = '(The user sent this photo with no message.)';

function turnText(turn: ChatHistoryTurn): string {
  const notes = [
    turn.hadImage ? EARLIER_PHOTO_NOTE : null,
    turn.actionStatus ? ACTION_OUTCOME_NOTES[turn.actionStatus] : null,
  ].filter(Boolean);
  return [turn.content, ...notes].filter(Boolean).join('\n');
}

/** The new message's parts: its photo first, as Gemini reads images best ahead of the text about them. */
function newMessageParts(message: string, image?: InlineImage): GeminiPart[] {
  if (!image) return [{ text: message }];
  const imagePart = { inlineData: { mimeType: image.mimeType, data: image.data.toString('base64') } };
  return [imagePart, { text: message || PHOTO_WITHOUT_CAPTION }];
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
}

/**
 * Stored turns become Gemini contents. Consecutive turns from the same side (a
 * pending-action preview followed by its confirmation) are merged, and a thread
 * window that opens on an assistant turn is trimmed, because Gemini expects the
 * conversation to start with the user and alternate from there.
 */
export function toConversationContents(
  history: readonly ChatHistoryTurn[],
  message: string,
  image?: InlineImage
): GeminiContent[] {
  const contents: GeminiContent[] = [];
  const turns = history.map((turn) => ({ role: turn.role, parts: [{ text: turnText(turn) }] as GeminiPart[] }));

  for (const turn of [...turns, { role: 'user' as const, parts: newMessageParts(message, image) }]) {
    const role = turn.role === 'user' ? 'user' : 'model';
    const previous = contents[contents.length - 1];

    if (!previous && role === 'model') continue;
    if (previous?.role === role) {
      previous.parts.push(...turn.parts);
    } else {
      contents.push({ role, parts: turn.parts });
    }
  }

  return contents;
}

function toFunctionResponsePart(call: GeminiFunctionCall, outcome: ToolOutcome<unknown>): GeminiPart {
  const response = outcome.ok ? { result: outcome.value } : { error: outcome.error };
  return { functionResponse: { id: call.id, name: call.name, response } };
}

type CallsOutcome = { pendingAction: PendingChatAction } | { responseParts: GeminiPart[] };

/**
 * Runs one model turn's calls in order. Reads execute immediately; the first
 * write or estimate that validates ends the turn as a pending action without
 * saving anything. A call that fails validation is reported back like any
 * other tool error, so the model can correct itself or ask the user.
 */
async function executeFunctionCalls(
  calls: readonly GeminiFunctionCall[],
  context: ChatToolContext
): Promise<CallsOutcome> {
  const responseParts: GeminiPart[] = [];

  for (const call of calls) {
    const tool = TOOLS_BY_NAME.get(call.name);
    const args = call.args ?? {};

    if (!tool) {
      responseParts.push(toFunctionResponsePart(call, { ok: false, error: `Unknown tool "${call.name}"` }));
      continue;
    }

    if (tool.kind === 'write' || tool.kind === 'estimate') {
      const prepared = await tool.prepare(args, context);
      if (prepared.ok) return { pendingAction: prepared.value };
      responseParts.push(toFunctionResponsePart(call, prepared));
      continue;
    }

    responseParts.push(toFunctionResponsePart(call, await tool.run(args, context)));
  }

  return { responseParts };
}

async function requestModelTurn(
  generateTurn: ConversationTurnGenerator,
  contents: readonly GeminiContent[],
  context: ChatToolContext,
  turnStartedAt: number
): Promise<GeminiContent> {
  const remainingBudgetMs = TURN_BUDGET_MS - (Date.now() - turnStartedAt);

  try {
    if (remainingBudgetMs <= 0) {
      throw new GeminiUnavailableError('The chat turn ran out of time between tool calls');
    }
    return await generateTurn({
      systemInstruction: buildChatSystemInstruction(context.today),
      contents,
      functionDeclarations: FUNCTION_DECLARATIONS,
      attemptTimeoutMs: Math.min(ATTEMPT_TIMEOUT_MS, remainingBudgetMs),
      totalBudgetMs: remainingBudgetMs,
    });
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
 * @throws AppError AI_UNAVAILABLE, CHAT_REJECTED, AI_BAD_RESPONSE or CHAT_STEP_LIMIT.
 */
export async function runChatTurn({
  history,
  message,
  image,
  context,
  generateTurn = generateConversationTurn,
}: RunChatTurnOptions): Promise<ChatTurnResult> {
  const contents = toConversationContents(history, message, image);
  const turnStartedAt = Date.now();

  for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration += 1) {
    const modelTurn = await requestModelTurn(generateTurn, contents, context, turnStartedAt);
    const calls = functionCallsIn(modelTurn);
    if (calls.length === 0) return finalReply(modelTurn);

    const outcome = await executeFunctionCalls(calls, context);
    if ('pendingAction' in outcome) {
      return { reply: outcome.pendingAction.preview, pendingAction: outcome.pendingAction };
    }

    // The model's own turn is replayed as sent, thought signatures included, before the tool results.
    contents.push(modelTurn, { role: 'user', parts: outcome.responseParts });
  }

  console.warn(`[ChatAgent] No final answer after ${MAX_AGENT_ITERATIONS} model calls`);
  throw new AppError(
    'The assistant could not finish answering that. Try asking in a simpler way.',
    502,
    'CHAT_STEP_LIMIT'
  );
}
