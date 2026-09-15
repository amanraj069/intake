import { GeminiContent, GeminiPart } from '../../lib/gemini/geminiConversation';
import { InlineImage } from '../../lib/gemini/geminiClient';
import { ChatActionStatus, ChatRole } from '../../models/ChatMessage';

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
  cancelled: '(Not saved: the user cancelled this change.)',
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
