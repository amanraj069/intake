import mongoose, { Schema, Document } from 'mongoose';

export const CHAT_ROLES = ['user', 'assistant'] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export const CHAT_WRITE_TOOLS = ['logMeal', 'setGoal'] as const;
export type ChatWriteTool = (typeof CHAT_WRITE_TOOLS)[number];

/**
 * Only whether a proposal was saved is stored, not its arguments. Cancelling
 * never reaches the server, so an unconfirmed proposal simply stays `pending`.
 */
export const CHAT_ACTION_STATUSES = ['pending', 'confirmed'] as const;
export type ChatActionStatus = (typeof CHAT_ACTION_STATUSES)[number];

/** Marks an assistant reply that proposed a change, so history can render it as that change's card. */
export interface StoredChatAction {
  tool: ChatWriteTool;
  status: ChatActionStatus;
}

/**
 * One visible turn of the assistant thread. Tool calls and tool results made
 * while producing a reply are never stored: they only matter inside the request
 * that produced the reply.
 */
export interface IChatMessageDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: ChatRole;
  content: string;
  action?: StoredChatAction;
  createdAt: Date;
}

const chatActionSchema = new Schema<StoredChatAction>(
  {
    tool: { type: String, enum: CHAT_WRITE_TOOLS, required: true },
    status: { type: String, enum: CHAT_ACTION_STATUSES, required: true },
  },
  { _id: false }
);

const chatMessageSchema = new Schema<IChatMessageDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: CHAT_ROLES,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    action: {
      type: chatActionSchema,
      default: undefined,
    },
  },
  {
    // Messages are never edited, so only the creation time is worth keeping.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Every read is "this user's thread, newest first", for history pages and context.
chatMessageSchema.index({ userId: 1, createdAt: -1, _id: -1 });

export const ChatMessage = mongoose.model<IChatMessageDocument>('ChatMessage', chatMessageSchema);
