"use client";

import { useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { ImageAttachIcon, NewChatIcon, SendIcon } from "@/components/icons";
import Spinner from "@/components/ui/Spinner";
import ComposerImagePreview from "./ComposerImagePreview";

/** Matches the server's limit, so a long message is stopped while typing rather than rejected after sending. */
export const MAX_CHAT_MESSAGE_LENGTH = 2000;

/** The remaining-characters counter only appears once a message gets close to the limit. */
const CHARACTER_COUNT_THRESHOLD = MAX_CHAT_MESSAGE_LENGTH - 200;

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendWithImage?: (image: File, caption: string) => void;
  /** Shown only once there is a conversation on screen to leave. */
  onNewChat?: () => void;
  sending: boolean;
  /** Why sending is paused, e.g. a proposed change still awaiting a decision. */
  blockedReason: string | null;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

const SURFACE_CLASSES =
  "relative mx-auto w-full max-w-5xl rounded-2xl sm:rounded-3xl border border-border dark:border-dark-border bg-bg-card dark:bg-dark-bg-card shadow-sm";

const ATTACH_BUTTON_CLASSES =
  "inline-flex h-8 min-w-8 sm:h-9 sm:min-w-9 items-center justify-center gap-2 rounded-full border border-border dark:border-dark-border px-2 sm:px-3 text-xs font-semibold text-text-secondary dark:text-dark-text-secondary " +
  "transition-all duration-150 hover:-translate-y-px hover:bg-bg-app dark:hover:bg-dark-bg-app hover:text-text-primary dark:hover:text-dark-text " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer";

const SEND_BUTTON_CLASSES =
  "flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 cursor-pointer " +
  "enabled:bg-accent enabled:hover:bg-accent-hover enabled:text-white dark:enabled:bg-accent-dark dark:enabled:hover:bg-accent-dark-hover dark:enabled:text-white " +
  "enabled:shadow-xs enabled:hover:shadow-sm dark:enabled:shadow-[0_0_14px_rgba(54,138,98,0.4)] dark:enabled:hover:shadow-[0_0_18px_rgba(54,138,98,0.55)] " +
  "enabled:hover:scale-105 enabled:active:scale-95 " +
  "disabled:bg-border/40 dark:disabled:bg-white/[0.06] disabled:text-text-secondary/40 dark:disabled:text-dark-text-secondary/30 disabled:cursor-not-allowed";

export default function ChatComposer({
  value,
  onChange,
  onSend,
  onSendWithImage,
  onNewChat,
  sending,
  blockedReason,
  inputRef,
}: ChatComposerProps) {
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasText = value.trim().length > 0;
  const canSend = (hasText || attachedImage !== null) && !sending && !blockedReason;

  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const computed = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computed.lineHeight) || 24;
    const paddingTop = parseFloat(computed.paddingTop) || 0;
    const paddingBottom = parseFloat(computed.paddingBottom) || 0;
    // Exactly 6 lines of text before internal scrolling starts
    const maxHeight = Math.ceil(lineHeight * 6 + paddingTop + paddingBottom);
    const targetHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${targetHeight}px`;
  }, [value, inputRef]);

  function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAttachedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    // Reset the file input so re-selecting the same file still triggers onChange
    event.target.value = "";
    inputRef.current?.focus();
  }

  function removeImage() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setAttachedImage(null);
    setImagePreviewUrl(null);
  }

  function submitMessage() {
    if (!canSend) return;
    if (!attachedImage || !onSendWithImage) {
      onSend();
      return;
    }
    onSendWithImage(attachedImage, value.trim());
    onChange("");
    removeImage();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submitMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends and Shift+Enter breaks the line; an IME composition's Enter only commits the text.
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submitMessage();
  }

  const showCharacterCount = value.length >= CHARACTER_COUNT_THRESHOLD;

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-6 lg:px-12"
    >
      <div className={SURFACE_CLASSES}>
        {blockedReason && (
          <p className="mx-2 mt-2 rounded-2xl bg-bg-app dark:bg-dark-bg-app px-3 py-2 text-xs font-light text-text-secondary dark:text-dark-text-secondary">
            {blockedReason}
          </p>
        )}

        {attachedImage && imagePreviewUrl && (
          <ComposerImagePreview file={attachedImage} previewUrl={imagePreviewUrl} onRemove={removeImage} />
        )}

        <label htmlFor="chat-message" className="sr-only">
          Message the assistant
        </label>
        <textarea
          id="chat-message"
          ref={inputRef}
          rows={1}
          value={value}
          maxLength={MAX_CHAT_MESSAGE_LENGTH}
          placeholder={attachedImage ? "Add a caption, e.g. 'I had this for lunch'" : "Ask about your nutrition or log a meal"}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="scrollbar-none block min-h-10 sm:min-h-12 w-full resize-none border-none bg-transparent px-3.5 pt-2.5 pb-0.5 sm:px-4 sm:pt-3.5 sm:pb-1 text-[13px] sm:text-[15px] leading-relaxed text-text-primary dark:text-dark-text placeholder:font-light placeholder:text-text-secondary/70 dark:placeholder:text-dark-text-secondary/60 focus:outline-none focus-visible:outline-none focus:ring-0 overflow-y-auto"
        />

        <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-0.5 sm:px-2.5 sm:pb-2.5 sm:pt-1">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} aria-label="Attach a food photo" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || !!blockedReason}
              className={ATTACH_BUTTON_CLASSES}
              aria-label="Attach image"
            >
              <ImageAttachIcon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Photo</span>
            </button>
            {onNewChat && (
              <button
                type="button"
                onClick={onNewChat}
                // Leaving mid-reply or with a change awaiting a decision would hide something the user still has to see.
                disabled={sending || !!blockedReason}
                className={ATTACH_BUTTON_CLASSES}
                aria-label="Start a new chat"
              >
                <NewChatIcon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">New chat</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {showCharacterCount && (
              <span className="text-[11px] font-light tabular-nums text-text-secondary dark:text-dark-text-secondary">
                {MAX_CHAT_MESSAGE_LENGTH - value.length} left
              </span>
            )}
            <span className="hidden text-[11px] font-light text-text-secondary/80 dark:text-dark-text-secondary/70 md:inline">
              <kbd className="font-sans font-semibold">Enter</kbd> to send, <kbd className="font-sans font-semibold">Shift + Enter</kbd> for a new line
            </span>
            <button type="submit" disabled={!canSend} aria-label="Send message" className={SEND_BUTTON_CLASSES}>
              {sending ? (
                <Spinner size="sm" className="h-3.5 w-3.5 text-current" />
              ) : (
                <SendIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
