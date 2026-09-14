import { ZodError } from 'zod';

import { GeminiFunctionDeclaration } from '../../lib/gemini/geminiConversation';
import { CalendarDay } from '../../lib/calendarDay';
import { ChatActionTool } from '../../models/ChatMessage';

/**
 * Everything a tool is scoped to. The user id comes from the authenticated
 * request, never from model-supplied arguments, so no tool can reach another
 * user's data however the model is prompted.
 */
export interface ChatToolContext {
  userId: string;
  today: CalendarDay;
}

/** A tool either produced a result or explains to the model what was wrong with its call. */
export type ToolOutcome<TValue> = { ok: true; value: TValue } | { ok: false; error: string };

/**
 * The result of a tool call that is shown to the user as a structured card
 * instead of plain text. For a write tool this is a change the user still has
 * to confirm, exactly as the confirm endpoint accepts it; for the estimate
 * tool it is already final, since nothing about it can be saved.
 */
export interface PendingChatAction {
  tool: ChatActionTool;
  args: Record<string, unknown>;
  /** One human-readable line describing what confirming will do, or what was estimated. */
  preview: string;
}

export interface ChatReadTool {
  kind: 'read';
  declaration: GeminiFunctionDeclaration;
  run(rawArgs: Record<string, unknown>, context: ChatToolContext): Promise<ToolOutcome<unknown>>;
}

export interface ChatWriteToolDefinition {
  kind: 'write';
  declaration: GeminiFunctionDeclaration;
  /** Validates and previews the write. Never touches stored data. */
  prepare(rawArgs: Record<string, unknown>, context: ChatToolContext): Promise<ToolOutcome<PendingChatAction>>;
}

/** Like a write tool, but its result never needs confirming: nothing about it is ever saved. */
export interface ChatEstimateToolDefinition {
  kind: 'estimate';
  declaration: GeminiFunctionDeclaration;
  prepare(rawArgs: Record<string, unknown>, context: ChatToolContext): Promise<ToolOutcome<PendingChatAction>>;
}

export type ChatTool = ChatReadTool | ChatWriteToolDefinition | ChatEstimateToolDefinition;

/** Validation issues in a form the model can read and correct in its next call. */
export function describeValidationError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return `Invalid arguments. ${issues.join('; ')}`;
}
