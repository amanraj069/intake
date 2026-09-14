"use client";

import type { ChatThreadMessage } from "@/types/chat";
import AiAvatar from "./AiAvatar";
import MessageActionsMenu from "./MessageActionsMenu";
import TodayProgressCard, { isTodayProgressMessage } from "./TodayProgressCard";

interface ChatBubbleProps {
  message: ChatThreadMessage;
  prevMessage?: ChatThreadMessage;
  showAvatar?: boolean;
  /** Omitted while the message is still sending, so it cannot be deleted mid-flight. */
  onDelete?: () => void;
}

const USER_CLASSES = "bg-accent-muted dark:bg-accent-dark-muted text-white rounded-br-md";
const ASSISTANT_CLASSES = "bg-bg-card dark:bg-dark-bg-card text-text-primary dark:text-dark-text rounded-bl-md border border-border dark:border-dark-border/50";
const TEXT_CLASSES =
  "relative whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-[13px] leading-normal sm:text-sm sm:leading-relaxed";
/**
 * Extra right padding for the actions menu: on desktop (sm) it stays compact
 * with no blank space when idle and smoothly expands on hover.
 */
const MENU_ROOM_CLASSES =
  "pr-7 sm:pr-4 transition-[padding-right] duration-200 ease-out sm:hover:pr-9 sm:group-hover:pr-9 sm:has-[[aria-expanded=true]]:pr-9";
/** Pinned to a bubble's top-right corner, on par with its first line. */
const MENU_POSITION_CLASSES = "absolute right-1 top-1 sm:right-1.5 sm:top-1.5";

function deliveryClasses(delivery: ChatThreadMessage["delivery"]): string {
  if (delivery === "sending") return "opacity-80";
  return "";
}

/** The user's turn: an optional photo with its caption beneath, both right-aligned. */
function UserBubble({ message, onDelete }: ChatBubbleProps) {
  return (
    <div className={`group flex flex-col items-end gap-1.5 transition-opacity duration-150 ${deliveryClasses(message.delivery)}`}>
      {message.imageUrl && (
        <a
          href={message.imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block max-w-[70%] sm:max-w-xs"
        >
          <img
            src={message.imageUrl}
            alt={message.content ? `Photo: ${message.content}` : "Food photo you sent"}
            className="max-h-72 w-full rounded-2xl rounded-br-md object-cover shadow-sm"
          />
          {onDelete && !message.content && (
            <MessageActionsMenu
              content={message.content}
              onDelete={onDelete}
              variant="accent"
              className={MENU_POSITION_CLASSES}
            />
          )}
        </a>
      )}
      {message.content && (
        <div className={`group max-w-[88%] sm:max-w-[75%] ${TEXT_CLASSES} ${onDelete ? MENU_ROOM_CLASSES : ""} ${USER_CLASSES}`}>
          <span className="sr-only">You: </span>
          {message.content}
          {onDelete && (
            <MessageActionsMenu
              content={message.content}
              onDelete={onDelete}
              variant="accent"
              className={MENU_POSITION_CLASSES}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** One plain turn of the conversation. Replies are plain text, so line breaks are kept as typed. */
export default function ChatBubble({ message, prevMessage, showAvatar = true, onDelete }: ChatBubbleProps) {
  if (message.role === "user") return <UserBubble message={message} showAvatar={showAvatar} onDelete={onDelete} />;

  if (isTodayProgressMessage(message, prevMessage)) {
    return (
      <div className={`flex justify-start items-end gap-2.5 transition-opacity duration-150 ${deliveryClasses(message.delivery)}`}>
        <AiAvatar visible={showAvatar} />
        <div className="group relative w-full max-w-[94%] sm:w-[480px] sm:max-w-[480px] rounded-2xl rounded-bl-md border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card p-3 sm:p-5 shadow-sm">
          <TodayProgressCard content={message.content} />
          {onDelete && <MessageActionsMenu content={message.content} onDelete={onDelete} className="absolute right-2 top-2 sm:right-3 sm:top-3" />}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-start items-end gap-2.5 transition-opacity duration-150 ${deliveryClasses(message.delivery)}`}>
      <AiAvatar visible={showAvatar} />
      <div
        className={`group max-w-[94%] sm:max-w-[75%] ${TEXT_CLASSES} ${
          onDelete ? MENU_ROOM_CLASSES : ""
        } ${ASSISTANT_CLASSES}`}
      >
        <span className="sr-only">Assistant: </span>
        {message.content}
        {onDelete && <MessageActionsMenu content={message.content} onDelete={onDelete} className={MENU_POSITION_CLASSES} />}
      </div>
    </div>
  );
}
