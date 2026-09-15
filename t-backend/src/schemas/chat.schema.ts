import { z } from 'zod';
import { CHAT_WRITE_TOOLS } from '../models/ChatMessage';
import { calendarDaySchema, objectIdSchema, paginationQueryFields } from './common.schema';

export const MAX_CHAT_MESSAGE_LENGTH = 2000;

/**
 * The client's own calendar day. Entries are stored against the day the user
 * sees, so "today" and "yesterday" in a message must resolve in their timezone,
 * not the server's.
 */
const clientTodayField = calendarDaySchema.optional();

/**
 * The body arrives as JSON, or as multipart form fields when a photo is
 * attached. With a photo the text is an optional caption, so an empty message
 * is allowed here and the controller rejects a request with neither.
 */
export const sendChatMessageSchema = z.object({
  body: z.object({
    message: z
      .string({ invalid_type_error: 'Message must be text' })
      .trim()
      .max(MAX_CHAT_MESSAGE_LENGTH, `Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer`)
      .default(''),
    today: clientTodayField,
  }),
});

/**
 * Only the envelope is checked here. `args` is re-validated by the action
 * service against the schema of the endpoint the tool wraps, since the client
 * copy of a pending action is never trusted.
 */
export const confirmChatActionSchema = z.object({
  body: z.object({
    /** The assistant reply that proposed the action, which is marked as confirmed. */
    messageId: objectIdSchema,
    tool: z.enum(CHAT_WRITE_TOOLS, {
      errorMap: () => ({ message: `Tool must be one of: ${CHAT_WRITE_TOOLS.join(', ')}` }),
    }),
    args: z.record(z.unknown(), { invalid_type_error: 'Args must be an object' }),
  }),
});

export const retryChatMessageSchema = z.object({
  params: z.object({ messageId: objectIdSchema }),
  body: z.object({ today: clientTodayField }),
});

export const chatMessageIdSchema = z.object({
  params: z.object({ messageId: objectIdSchema }),
});

export const chatHistorySchema = z.object({
  query: z.object({
    ...paginationQueryFields,
    /**
     * Returns only messages older than this one. Paging from a fixed message
     * stays stable while new messages are sent, where a page number would shift.
     */
    before: objectIdSchema.optional(),
  }),
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>['body'];
export type ConfirmChatActionInput = z.infer<typeof confirmChatActionSchema>['body'];
export type ChatHistoryQuery = z.infer<typeof chatHistorySchema>['query'];
