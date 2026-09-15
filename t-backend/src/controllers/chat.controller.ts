import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { CalendarDay, resolveClientToday } from '../lib/calendarDay';
import { openEventStream, wantsEventStream } from '../lib/sse';
import { AppError } from '../middleware/errorHandler';
import { getValidatedInput } from '../middleware/validate';
import {
  cancelChatActionSchema,
  chatHistorySchema,
  chatMessageIdSchema,
  confirmChatActionSchema,
  retryChatMessageSchema,
  sendChatMessageSchema,
} from '../schemas/chat.schema';
import * as chatActionService from '../services/chat/chatAction.service';
import { PendingChatAction } from '../services/chat/chatToolTypes';
import { ChatTurnCallbacks } from '../services/chatAgent';
import * as chatMessageService from '../services/chatMessage.service';
import type { ChatExchange, ReplyClock } from '../services/chatMessage.service';

type ExchangeRunner = (callbacks: ChatTurnCallbacks | undefined) => Promise<ChatExchange>;

/** A nutrition estimate never needs confirming, so it is reported like any other reply. */
function replyMessage(pendingAction: PendingChatAction | null): string {
  if (pendingAction && pendingAction.tool !== 'estimateNutrition') return 'Review the proposed change';
  return 'Reply received';
}

function toExchangeBody(exchange: ChatExchange) {
  return { success: true, message: replyMessage(exchange.pendingAction), data: exchange };
}

/** The envelope `errorHandler` sends, for a failure that happens after the stream's headers are already out. */
function toStreamErrorBody(error: unknown) {
  if (!(error instanceof AppError)) console.error('[Chat] Streamed reply failed unexpectedly:', error);
  const appError =
    error instanceof AppError ? error : new AppError('The assistant could not reply.', 500, 'CHAT_REPLY_FAILED');
  return { success: false, message: appError.message, code: appError.code, details: appError.details };
}

/**
 * The client's day and wall-clock time. The time is only trusted together with
 * the day it came with: when that day is rejected as too far from the server's,
 * the time is dropped too, and the assistant asks instead of guessing a meal.
 */
function resolveClientClock(body: { today?: CalendarDay; localTime?: string }): ReplyClock {
  const today = resolveClientToday(body.today);
  return { today, localTime: today === body.today ? body.localTime : undefined };
}

async function sendExchangeAsJson(res: Response, runExchange: ExchangeRunner): Promise<void> {
  const exchange = await runExchange(undefined);
  res.status(200).json(toExchangeBody(exchange));
}

/** Streams `status` and `token` events while the turn runs, then exactly one `done` or `error` event. */
async function streamExchange(res: Response, runExchange: ExchangeRunner): Promise<void> {
  const stream = openEventStream(res);
  try {
    const exchange = await runExchange({
      onTextDelta: (delta) => stream.send('token', { delta }),
      onStatus: (status) => stream.send('status', { status }),
    });
    stream.send('done', toExchangeBody(exchange));
  } catch (error) {
    stream.send('error', toStreamErrorBody(error));
  } finally {
    stream.end();
  }
}

function respondWithExchange(req: Request, res: Response, runExchange: ExchangeRunner): Promise<void> {
  return wantsEventStream(req) ? streamExchange(res, runExchange) : sendExchangeAsJson(res, runExchange);
}

/**
 * POST /api/chat
 * Sends one message, optionally with a multipart `image`, to the assistant and
 * returns its reply, plus a pending action when the reply proposes a change
 * that still needs confirming. Streams SSE events when the client asks for them.
 */
export async function sendChatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { body } = getValidatedInput(req, sendChatMessageSchema);
    if (!body.message && !req.file) {
      throw new AppError('Type a message or attach a photo', 400, 'MESSAGE_REQUIRED');
    }

    const clock = resolveClientClock(body);
    const image = req.file?.buffer;

    await respondWithExchange(req, res, (callbacks) =>
      chatMessageService.sendChatMessage(userId, { message: body.message, image, ...clock, callbacks })
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/chat/messages/:messageId/retry
 * Produces the reply again for the caller's latest message, after its reply
 * failed or never arrived. Returns the same exchange as sending it did.
 */
export async function retryChatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { params, body } = getValidatedInput(req, retryChatMessageSchema);
    const clock = resolveClientClock(body);

    await respondWithExchange(req, res, (callbacks) =>
      chatMessageService.retryChatMessage(userId, params.messageId, { ...clock, callbacks })
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/chat/confirm-action
 * Carries out a pending action the user confirmed, after validating it again,
 * and marks the proposing reply as confirmed.
 */
export async function confirmChatAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { body } = getValidatedInput(req, confirmChatActionSchema);
    const confirmed = await chatActionService.confirmChatAction(userId, body);

    res.status(201).json({
      success: true,
      message: confirmed.tool === 'logMeal' ? 'Meal logged' : 'Goal saved',
      data: confirmed,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/chat/cancel-action
 * Marks a pending action as cancelled, so it is not offered again after a reload.
 */
export async function cancelChatAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { body } = getValidatedInput(req, cancelChatActionSchema);
    const message = await chatActionService.cancelChatAction(userId, body.messageId);

    res.status(200).json({ success: true, message: 'Change cancelled', data: message });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/chat/history
 * One page of the user's thread, newest page first.
 */
export async function getChatHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { query } = getValidatedInput(req, chatHistorySchema);
    const page = await chatMessageService.listChatHistory(userId, query);

    res.status(200).json({
      success: true,
      message: 'Chat history retrieved successfully',
      ...page,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/chat/messages/:messageId
 * Removes one message from the caller's own thread. Never reverses anything
 * that message's reply already did, such as a logged meal.
 */
export async function deleteChatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { params } = getValidatedInput(req, chatMessageIdSchema);
    const message = await chatMessageService.deleteChatMessage(userId, params.messageId);

    res.status(200).json({ success: true, message: 'Message deleted', data: message });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/chat/messages/:messageId/restore
 * Undoes a delete, bringing the message back into the caller's thread.
 */
export async function restoreChatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { params } = getValidatedInput(req, chatMessageIdSchema);
    const message = await chatMessageService.restoreChatMessage(userId, params.messageId);

    res.status(200).json({ success: true, message: 'Message restored', data: message });
  } catch (error) {
    next(error);
  }
}
