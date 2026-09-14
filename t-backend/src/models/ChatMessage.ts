import mongoose, { Schema, Document } from 'mongoose';

export const CHAT_ROLES = ['user', 'assistant'] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export const CHAT_WRITE_TOOLS = ['logMeal', 'setGoal'] as const;
export type ChatWriteTool = (typeof CHAT_WRITE_TOOLS)[number];

/** Every tool whose call is shown as a structured card, whether or not it can be confirmed. */
export const CHAT_ACTION_TOOLS = [...CHAT_WRITE_TOOLS, 'estimateNutrition'] as const;
export type ChatActionTool = (typeof CHAT_ACTION_TOOLS)[number];

/**
 * Cancelling never reaches the server, so an unconfirmed proposal simply stays
 * `pending`. `estimate` never becomes `confirmed`: it answers a question, it
 * never proposes saving anything.
 */
export const CHAT_ACTION_STATUSES = ['pending', 'confirmed', 'estimate'] as const;
export type ChatActionStatus = (typeof CHAT_ACTION_STATUSES)[number];

/**
 * Marks an assistant reply that proposed a change, so history can render it as
 * that change's card. The validated arguments are kept so a saved meal still
 * shows its items and macros after a reload; replies stored before this field
 * existed have none.
 */
export interface StoredChatAction {
  tool: ChatActionTool;
  status: ChatActionStatus;
  args?: Record<string, unknown>;
}

/** Why the assistant could not answer a user message, kept so the thread can offer a retry after a reload. */
export interface StoredReplyError {
  message: string;
  code?: string;
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
  /** Empty when the user sent only a photo. */
  content: string;
  imageUrl?: string;
  imagePublicId?: string;
  /** Set on a user message whose reply failed; cleared when a retry starts. */
  replyError?: StoredReplyError;
  /** When a reply was last started for a user message: its creation, or its latest retry. */
  replyRequestedAt?: Date;
  action?: StoredChatAction;
  /**
   * Set when the user deletes this message from their own view of the thread.
   * Deleting only hides a message: it never reverses an action the message
   * already carried out, such as a logged meal, so nothing else changes.
   */
  deletedAt?: Date;
  createdAt: Date;
}

const chatActionSchema = new Schema<StoredChatAction>(
  {
    tool: { type: String, enum: CHAT_ACTION_TOOLS, required: true },
    status: { type: String, enum: CHAT_ACTION_STATUSES, required: true },
    args: { type: Schema.Types.Mixed, default: undefined },
  },
  { _id: false }
);

const replyErrorSchema = new Schema<StoredReplyError>(
  {
    message: { type: String, required: true },
    code: { type: String },
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
      default: '',
      // A photo can be sent without a caption, but a message cannot be empty altogether.
      required: [
        function (this: IChatMessageDocument) {
          return !this.imageUrl;
        },
        'Message content is required',
      ],
    },
    imageUrl: {
      type: String,
    },
    imagePublicId: {
      type: String,
    },
    replyError: {
      type: replyErrorSchema,
      default: undefined,
    },
    replyRequestedAt: {
      type: Date,
    },
    action: {
      type: chatActionSchema,
      default: undefined,
    },
    deletedAt: {
      type: Date,
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
