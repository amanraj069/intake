"use client";

import { useRef, useState } from "react";
import ErrorState from "@/components/ui/ErrorState";
import Spinner from "@/components/ui/Spinner";
import { useChatThread } from "@/hooks/useChatThread";
import { HistoryIcon } from "@/components/icons";
import ChatComposer from "./ChatComposer";
import ChatEmptyState from "./ChatEmptyState";
import ChatMessageList from "./ChatMessageList";
import DeletedMessageToast from "./DeletedMessageToast";

const AWAITING_DECISION_MESSAGE = "Confirm or cancel the proposed change to keep chatting.";

export default function ChatThread() {
  const thread = useChatThread();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function fillComposer(text: string) {
    setDraft(text);
    inputRef.current?.focus();
  }

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    thread.send(text);
  }

  function startNewChat() {
    thread.startNewChat();
    inputRef.current?.focus();
  }

  if (thread.loadError && thread.showingPreviousChats) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <ErrorState message={thread.loadError} onRetry={thread.reload} />
      </div>
    );
  }

  const isEmptyChat = thread.visibleMessages.length === 0 && !thread.sending;
  const canOpenPreviousChats = thread.hasPreviousChats && !thread.showingPreviousChats;
  const isLoadingPreviousChats = thread.showingPreviousChats && thread.loading;

  return (
    <section aria-label="Chat" className="relative flex h-full flex-col">
      {canOpenPreviousChats && isEmptyChat && (
        <div className="pointer-events-none absolute inset-x-0 top-4 sm:top-6 z-20 px-3 sm:px-8 lg:px-12">
          <div className="mx-auto flex w-full max-w-5xl justify-end">
            <button
              type="button"
              onClick={thread.showPreviousChats}
              className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border dark:border-dark-border bg-bg-card/90 dark:bg-dark-bg-card/90 backdrop-blur-xs px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text hover:bg-bg-app dark:hover:bg-dark-surface hover:border-accent/50 dark:hover:border-accent-dark/50 cursor-pointer transition-all duration-150 shadow-xs"
              title="Load previous chats"
            >
              <HistoryIcon className="h-4 w-4 text-accent dark:text-accent-dark" />
              <span>Load previous chats</span>
            </button>
          </div>
        </div>
      )}

      {isLoadingPreviousChats ? (
        <div className="flex flex-1 items-center justify-center text-text-secondary dark:text-dark-text-secondary">
          <Spinner />
        </div>
      ) : isEmptyChat && !thread.showingPreviousChats ? (
        <ChatEmptyState onPickPrompt={fillComposer} />
      ) : (
        <ChatMessageList
          messages={thread.visibleMessages}
          sending={thread.sending}
          hasEarlier={thread.hasEarlier}
          loadingEarlier={thread.loadingEarlier}
          earlierError={thread.earlierError}
          onLoadEarlier={thread.loadEarlier}
          onShowPreviousChats={canOpenPreviousChats ? thread.showPreviousChats : undefined}
          // Mounting already showing previous chats means they were just opened from the empty screen.
          glideOnOpen={thread.showingPreviousChats}
          onRetryFailed={thread.retryFailedMessage}
          onEditFailed={(messageId) => fillComposer(thread.takeBackFailedMessage(messageId))}
          onConfirmAction={thread.confirmAction}
          onCancelAction={thread.cancelAction}
          onDeleteMessage={thread.deleteMessage}
          onLogAnother={() => fillComposer("")}
          onSend={thread.send}
        />
      )}

      {thread.deletedMessage && (
        <DeletedMessageToast
          key={thread.deletedMessage.id}
          onUndo={thread.undoDelete}
          onDismiss={thread.dismissDeletedMessage}
        />
      )}

      <ChatComposer
        value={draft}
        onChange={setDraft}
        onSend={handleSend}
        onSendWithImage={(image, caption) => thread.send(caption, image)}
        onNewChat={isEmptyChat && !thread.showingPreviousChats ? undefined : startNewChat}
        // Sending waits for the first history page, so a fresh message is never mistaken for an old one.
        sending={thread.sending || thread.loading}
        blockedReason={thread.awaitingDecision ? AWAITING_DECISION_MESSAGE : null}
        inputRef={inputRef}
      />
    </section>
  );
}
