"use client";

import { useEffect, useRef, useState } from "react";
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
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // A meal is only proposed when the user asked to log it, so it is saved straight away and shown as a receipt.
  useEffect(() => {
    const pendingLogMeal = thread.messages.find(
      (m) => m.action?.status === "pending" && m.action.payload.tool === "logMeal"
    );
    if (pendingLogMeal) {
      thread.confirmAction(pendingLogMeal.id);
    }
  }, [thread.messages, thread.confirmAction]);


  // When switching between tabs, return to "How can I help?" only when the chatbot is not answering.
  useEffect(() => {
    function handleTabSwitch() {
      if (document.visibilityState === "visible" && !thread.sending) {
        setShowHistory(false);
      }
    }

    document.addEventListener("visibilitychange", handleTabSwitch);
    window.addEventListener("focus", handleTabSwitch);
    return () => {
      document.removeEventListener("visibilitychange", handleTabSwitch);
      window.removeEventListener("focus", handleTabSwitch);
    };
  }, [thread.sending]);

  function fillComposer(text: string) {
    setDraft(text);
    inputRef.current?.focus();
  }

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setShowHistory(true);
    thread.send(text);
  }

  function handleSendWithImage(image: File, caption: string) {
    setShowHistory(true);
    thread.send(caption, image);
  }

  if (thread.loadError && showHistory) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <ErrorState message={thread.loadError} onRetry={thread.reload} />
      </div>
    );
  }

  const hasHistory = thread.messages.length > 0;
  const isViewingEmptyState = !showHistory && !thread.sending;

  return (
    <section aria-label="Chat" className="relative flex h-full flex-col">
      {hasHistory && isViewingEmptyState && (
        <div className="pointer-events-none absolute inset-x-0 top-4 sm:top-6 z-20 px-3 sm:px-8 lg:px-12">
          <div className="mx-auto flex w-full max-w-5xl justify-end">
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border dark:border-dark-border bg-bg-card/90 dark:bg-dark-bg-card/90 backdrop-blur-xs px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text hover:bg-bg-app dark:hover:bg-dark-surface hover:border-accent/50 dark:hover:border-accent-dark/50 cursor-pointer transition-all duration-150 shadow-xs"
              title="Load previous chats"
            >
              <HistoryIcon className="h-4 w-4 text-accent dark:text-accent-dark" />
              <span>Load previous chats</span>
            </button>
          </div>
        </div>
      )}

      {isViewingEmptyState ? (
        <ChatEmptyState onPickPrompt={fillComposer} />
      ) : thread.loading ? (
        <div className="flex flex-1 items-center justify-center text-text-secondary dark:text-dark-text-secondary">
          <Spinner />
        </div>
      ) : (
        <ChatMessageList
          messages={thread.messages}
          sending={thread.sending}
          hasEarlier={thread.hasEarlier}
          loadingEarlier={thread.loadingEarlier}
          earlierError={thread.earlierError}
          onLoadEarlier={thread.loadEarlier}
          onRetryFailed={thread.retryFailedMessage}
          onEditFailed={(messageId) => fillComposer(thread.takeBackFailedMessage(messageId))}
          onConfirmAction={thread.confirmAction}
          onCancelAction={thread.cancelAction}
          onDeleteMessage={thread.deleteMessage}
          onLogAnother={() => fillComposer("")}
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
        onSendWithImage={handleSendWithImage}
        sending={thread.sending || (showHistory && thread.loading)}
        blockedReason={thread.awaitingDecision ? AWAITING_DECISION_MESSAGE : null}
        inputRef={inputRef}
      />
    </section>
  );
}
