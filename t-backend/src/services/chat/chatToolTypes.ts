import { ZodError } from 'zod';

import { GeminiFunctionDeclaration } from '../../lib/gemini/geminiConversation';
import { CalendarDay } from '../../lib/calendarDay';
import { ChatWriteTool } from '../../models/ChatMessage';

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

/** A validated write the user still has to confirm, exactly as the confirm endpoint accepts it. */
export interface PendingChatAction {
  tool: ChatWriteTool;
  args: Record<string, unknown>;
  /** One human-readable line describing what confirming will do. */
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

export type ChatTool = ChatReadTool | ChatWriteToolDefinition;

/** Validation issues in a form the model can read and correct in its next call. */
export function describeValidationError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return `Invalid arguments. ${issues.join('; ')}`;
}
