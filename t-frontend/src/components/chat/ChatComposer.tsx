"use client";

import { useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { ImageAttachIcon, SendIcon } from "@/components/icons";
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
  sending: boolean;
  /** Why sending is paused, e.g. a proposed change still awaiting a decision. */
  blockedReason: string | null;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

const SURFACE_CLASSES =
  "relative mx-auto w-full max-w-5xl rounded-2xl sm:rounded-3xl border border-border dark:border-dark-border bg-bg-card/95 dark:bg-dark-bg-card/95 backdrop-blur-xl " +
  "shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_12px_40px_-12px_rgba(41,37,36,0.18)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_16px_48px_-12px_rgba(0,0,0,0.7)] " +
  "transition-[border-color,box-shadow] duration-200 focus-within:border-accent/40 dark:focus-within:border-accent-dark/40 " +
  "focus-within:shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_0_0_4px_rgba(59,122,87,0.08),0_12px_40px_-12px_rgba(41,37,36,0.22)] " +
  "dark:focus-within:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_0_0_4px_rgba(54,138,98,0.12),0_16px_48px_-12px_rgba(0,0,0,0.7)]";

const ATTACH_BUTTON_CLASSES =
  "inline-flex h-8 min-w-8 sm:h-9 sm:min-w-9 items-center justify-center gap-2 rounded-full border border-border dark:border-dark-border px-2 sm:px-3 text-xs font-semibold text-text-secondary dark:text-dark-text-secondary " +
  "transition-all duration-150 hover:-translate-y-px hover:bg-bg-app dark:hover:bg-dark-bg-app hover:text-text-primary dark:hover:text-dark-text " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer";

const SEND_BUTTON_CLASSES =
  "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-150 cursor-pointer " +
  "enabled:bg-gradient-to-b enabled:from-accent enabled:to-accent-muted dark:enabled:from-accent-dark dark:enabled:to-accent-dark-muted enabled:text-white " +
  "enabled:shadow-[0_4px_14px_-4px_rgba(59,122,87,0.6)] enabled:hover:-translate-y-px enabled:hover:brightness-110 enabled:active:scale-95 " +
  "disabled:bg-bg-app dark:disabled:bg-dark-bg-app disabled:text-text-secondary/50 dark:disabled:text-dark-text-secondary/40 disabled:cursor-not-allowed";

export default function ChatComposer({ value, onChange, onSend, onSendWithImage, sending, blockedReason, inputRef }: ChatComposerProps) {
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasText = value.trim().length > 0;
  const canSend = (hasText || attachedImage !== null) && !sending && !blockedReason;

  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
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
      className="relative shrink-0 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-6 lg:px-12"
    >
      {/* Fade so the message list appears to scroll beneath the floating composer */}
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 sm:-top-10 sm:h-10 bg-gradient-to-t from-bg-app dark:from-dark-bg-app to-transparent" />

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
          className="block max-h-32 sm:max-h-48 min-h-10 sm:min-h-12 w-full resize-none border-none bg-transparent px-3.5 pt-2.5 pb-0.5 sm:px-4 sm:pt-3.5 sm:pb-1 text-[13px] sm:text-[15px] leading-relaxed text-text-primary dark:text-dark-text placeholder:font-light placeholder:text-text-secondary/70 dark:placeholder:text-dark-text-secondary/60 focus:outline-none focus:ring-0"
        />

        <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-0.5 sm:px-2.5 sm:pb-2.5 sm:pt-1">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} aria-label="Attach a food photo" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || !!blockedReason}
            className={ATTACH_BUTTON_CLASSES}
            aria-label="Attach image"
          >
            <ImageAttachIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Photo</span>
          </button>

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
              <SendIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
