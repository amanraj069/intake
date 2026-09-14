import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { resolveClientToday } from '../lib/calendarDay';
import { AppError } from '../middleware/errorHandler';
import { getValidatedInput } from '../middleware/validate';
import {
  chatHistorySchema,
  chatMessageIdSchema,
  confirmChatActionSchema,
  retryChatMessageSchema,
  sendChatMessageSchema,
} from '../schemas/chat.schema';
import * as chatActionService from '../services/chat/chatAction.service';
import { PendingChatAction } from '../services/chat/chatToolTypes';
import * as chatMessageService from '../services/chatMessage.service';

/** A nutrition estimate never needs confirming, so it is reported like any other reply. */
function replyMessage(pendingAction: PendingChatAction | null): string {
  if (pendingAction && pendingAction.tool !== 'estimateNutrition') return 'Review the proposed change';
  return 'Reply received';
}

/**
 * POST /api/chat
 * Sends one message, optionally with a multipart `image`, to the assistant and
 * returns its reply, plus a pending action when the reply proposes a change
 * that still needs confirming.
 */
export async function sendChatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { body } = getValidatedInput(req, sendChatMessageSchema);
    if (!body.message && !req.file) {
      throw new AppError('Type a message or attach a photo', 400, 'MESSAGE_REQUIRED');
    }

    const exchange = await chatMessageService.sendChatMessage(userId, {
      message: body.message,
      image: req.file?.buffer,
      today: resolveClientToday(body.today),
    });

    res.status(200).json({
      success: true,
      message: replyMessage(exchange.pendingAction),
      data: exchange,
    });
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
    const exchange = await chatMessageService.retryChatMessage(userId, params.messageId, resolveClientToday(body.today));

    res.status(200).json({
      success: true,
      message: replyMessage(exchange.pendingAction),
      data: exchange,
    });
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
