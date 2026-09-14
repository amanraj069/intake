"use client";

import { useEffect, useRef, useState } from "react";
import ErrorState from "@/components/ui/ErrorState";
import Spinner from "@/components/ui/Spinner";
import { useChatThread } from "@/hooks/useChatThread";
import ChatComposer from "./ChatComposer";
import ChatEmptyState from "./ChatEmptyState";
import ChatMessageList from "./ChatMessageList";
import { api } from "@/lib/api";

const AWAITING_DECISION_MESSAGE = "Confirm or cancel the proposed change to keep chatting.";

export default function ChatThread() {
  const thread = useChatThread();
  const [draft, setDraft] = useState("");
  const [extractingImage, setExtractingImage] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-confirm logMeal actions so the user gets the receipt instantly
  useEffect(() => {
    const pendingLogMeal = thread.messages.find(
      (m) => m.action?.status === "pending" && m.action.payload.tool === "logMeal"
    );
    if (pendingLogMeal) {
      thread.confirmAction(pendingLogMeal.id);
    }
  }, [thread.messages, thread.confirmAction]);

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

  async function handleSendWithImage(image: File, caption: string) {
    setExtractingImage(true);

    try {
      // 1. Send the image to the extraction API
      const response = await api.extractNutritionFromImage(image, caption);
      const { extraction } = response.data!;
      
      // 2. Synthesize a prompt that forces the AI to use this exact data
      const prompt = [
        caption ? `I had this: ${caption}.` : "I had this meal.",
        "Please log this meal with the following exact details:",
        ...extraction.items.map(
          (item) =>
            `- ${item.quantity} ${item.unit} ${item.name}: ${Math.round(item.calories)} kcal, ${item.macros.proteinG}g protein, ${item.macros.carbG}g carbs, ${item.macros.fatG}g fat`
        ),
      ].join("\n");
      
      // 3. Send it to the chat flow (it will propose a logMeal and auto-confirm)
      thread.send(prompt);
    } catch (error) {
      // If extraction fails, fallback to just sending the text caption
      if (caption) {
        thread.send(caption);
      }
    } finally {
      setExtractingImage(false);
    }
  }

  if (thread.loadError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <ErrorState message={thread.loadError} onRetry={thread.reload} />
      </div>
    );
  }

  const isEmpty = thread.messages.length === 0 && !thread.sending && !extractingImage;

  return (
    <section aria-label="Assistant" className="flex h-full flex-col">
      {thread.loading ? (
        <div className="flex flex-1 items-center justify-center text-text-secondary dark:text-dark-text-secondary">
          <Spinner />
        </div>
      ) : isEmpty ? (
        <ChatEmptyState onPickPrompt={fillComposer} />
      ) : (
        <ChatMessageList
          messages={thread.messages}
          sending={thread.sending || extractingImage}
          sendFailure={thread.sendFailure}
          hasEarlier={thread.hasEarlier}
          loadingEarlier={thread.loadingEarlier}
          earlierError={thread.earlierError}
          onLoadEarlier={thread.loadEarlier}
          onRetryFailed={thread.retryFailedMessage}
          onEditFailed={() => fillComposer(thread.takeBackFailedMessage())}
          onConfirmAction={thread.confirmAction}
          onCancelAction={thread.cancelAction}
          onLogAnother={() => fillComposer("")}
        />
      )}

      <ChatComposer
        value={draft}
        onChange={setDraft}
        onSend={handleSend}
        onSendWithImage={handleSendWithImage}
        sending={thread.sending || thread.loading || extractingImage}
        blockedReason={thread.awaitingDecision ? AWAITING_DECISION_MESSAGE : null}
        inputRef={inputRef}
      />
    </section>
  );
}
