import mongoose, { Schema, Document } from 'mongoose';
import type { ExtractionAnalysis } from '../lib/extractionAnalysis';
import { FOOD_ITEM_UNITS, FoodItemUnit } from './FoodEntry';

export const CHAT_ROLES = ['user', 'assistant'] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export const CHAT_WRITE_TOOLS = ['logMeal', 'setGoal'] as const;
export type ChatWriteTool = (typeof CHAT_WRITE_TOOLS)[number];

/** Every tool whose call is shown as a structured card, whether or not it can be confirmed. */
export const CHAT_ACTION_TOOLS = [...CHAT_WRITE_TOOLS, 'estimateNutrition'] as const;
export type ChatActionTool = (typeof CHAT_ACTION_TOOLS)[number];

/**
 * A proposal stays `pending` until the user confirms or cancels it, so an
 * undecided card is offered again after a reload. `estimate` never becomes
 * `confirmed`: it answers a question, it never proposes saving anything.
 */
export const CHAT_ACTION_STATUSES = ['pending', 'confirmed', 'cancelled', 'estimate'] as const;
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
  /** Set on a meal proposed from a photo, so confirming it saves that photo and its confidence breakdown too. */
  mealPhoto?: StoredMealPhoto;
  /** Other names the model gave a proposed meal's foods, added to the meal catalogue once it is confirmed. */
  catalogueSynonyms?: StoredCatalogueSynonyms;
}

/** One proposed food's other names. The food is found again by name and unit, not position, when the meal is saved. */
export interface StoredFoodSynonyms {
  name: string;
  unit: FoodItemUnit;
  synonyms: string[];
}

/**
 * Server-side only, like `mealPhoto`: the client never echoes these back, so
 * which names reach the user's catalogue is never its call.
 */
export interface StoredCatalogueSynonyms {
  /** Other names for the whole meal, when it has several items. */
  dish: string[];
  items: StoredFoodSynonyms[];
}

/**
 * Server-side only: the client echoes `args` back on confirm, but never this,
 * so which photo and which confidence a meal is saved with is never its call.
 */
export interface StoredMealPhoto {
  /** The chat message's own upload. Confirming copies it into the meal folder. */
  imageUrl: string;
  analysis: ExtractionAnalysis;
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

const mealPhotoSchema = new Schema<StoredMealPhoto>(
  {
    imageUrl: { type: String, required: true },
    analysis: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const foodSynonymsSchema = new Schema<StoredFoodSynonyms>(
  {
    name: { type: String, required: true },
    unit: { type: String, enum: FOOD_ITEM_UNITS, required: true },
    synonyms: { type: [String], default: [] },
  },
  { _id: false }
);

const catalogueSynonymsSchema = new Schema<StoredCatalogueSynonyms>(
  {
    dish: { type: [String], default: [] },
    items: { type: [foodSynonymsSchema], default: [] },
  },
  { _id: false }
);

const chatActionSchema = new Schema<StoredChatAction>(
  {
    tool: { type: String, enum: CHAT_ACTION_TOOLS, required: true },
    status: { type: String, enum: CHAT_ACTION_STATUSES, required: true },
    args: { type: Schema.Types.Mixed, default: undefined },
    mealPhoto: { type: mealPhotoSchema, default: undefined },
    catalogueSynonyms: { type: catalogueSynonymsSchema, default: undefined },
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
