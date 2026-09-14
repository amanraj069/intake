import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../lib/authenticatedUser';
import { resolveClientToday } from '../lib/calendarDay';
import { getValidatedInput } from '../middleware/validate';
import { chatHistorySchema, confirmChatActionSchema, sendChatMessageSchema } from '../schemas/chat.schema';
import * as chatActionService from '../services/chat/chatAction.service';
import * as chatMessageService from '../services/chatMessage.service';

/**
 * POST /api/chat
 * Sends one message to the assistant and returns its reply, plus a pending
 * action when the reply proposes a change that still needs confirming.
 */
export async function sendChatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { body } = getValidatedInput(req, sendChatMessageSchema);
    const exchange = await chatMessageService.sendChatMessage(
      userId,
      body.message,
      resolveClientToday(body.today)
    );

    res.status(200).json({
      success: true,
      message: exchange.pendingAction ? 'Review the proposed change' : 'Reply received',
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
