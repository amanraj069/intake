"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { api } from "@/lib/api";
import { prependOlderPage } from "@/lib/chatThread";
import { toErrorMessage } from "@/lib/errorMessage";
import type { ChatMessage, ChatThreadMessage } from "@/types/chat";

/** Kept small so opening previous chats is instant; scrolling up fetches the next few. */
export const CHAT_HISTORY_PAGE_SIZE = 4;

interface UseChatHistoryResult {
  messages: ChatThreadMessage[];
  setMessages: Dispatch<SetStateAction<ChatThreadMessage[]>>;
  /** Messages from earlier conversations, hidden until the user asks to see them. */
  previousChatIds: ReadonlySet<string>;
  /** Files messages under previous chats, e.g. everything on screen when a new chat starts. */
  archiveMessages: (ids: string[]) => void;
  loading: boolean;
  loadError: string | null;
  reload: () => void;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  earlierError: string | null;
  loadEarlier: () => void;
}

function addIds(current: ReadonlySet<string>, ids: string[]): ReadonlySet<string> {
  return new Set([...current, ...ids]);
}

/**
 * Loads the newest few stored messages, then older ones on request. Older
 * pages are fetched from the oldest message already held rather than by page
 * number, so messages sent during this visit never shift what comes back.
 * The messages it holds are the thread's single source of truth; `setMessages`
 * lets the thread hook append live turns to the same list.
 */
export function useChatHistory(): UseChatHistoryResult {
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [previousChatIds, setPreviousChatIds] = useState<ReadonlySet<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [earlierError, setEarlierError] = useState<string | null>(null);
  const oldestLoadedId = useRef<string | null>(null);
  // Scroll events fire many times per gesture; state updates too late to stop duplicate requests.
  const earlierRequestInFlight = useRef(false);

  const storeOlderPage = useCallback((page: ChatMessage[], totalPages: number) => {
    setMessages((current) => prependOlderPage(current, page));
    setPreviousChatIds((current) => addIds(current, page.map((message) => message._id)));
    oldestLoadedId.current = page.at(-1)?._id ?? oldestLoadedId.current;
    setHasEarlier(totalPages > 1);
  }, []);

  const fetchLatestPage = useCallback(async () => {
    try {
      const response = await api.getChatHistory(1, CHAT_HISTORY_PAGE_SIZE);
      storeOlderPage(response.data ?? [], response.totalPages);
      setLoadError(null);
    } catch (cause) {
      setLoadError(toErrorMessage(cause, "Could not load your previous chats."));
    } finally {
      setLoading(false);
    }
  }, [storeOlderPage]);

  useEffect(() => {
    // Loading the thread on mount is this hook's job, and every state write
    // happens after an await. The rule cannot see past the call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLatestPage();
  }, [fetchLatestPage]);

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void fetchLatestPage();
  }, [fetchLatestPage]);

  const loadEarlier = useCallback(async () => {
    const before = oldestLoadedId.current;
    if (!before || earlierRequestInFlight.current) return;

    earlierRequestInFlight.current = true;
    setLoadingEarlier(true);
    setEarlierError(null);
    try {
      const response = await api.getChatHistory(1, CHAT_HISTORY_PAGE_SIZE, before);
      storeOlderPage(response.data ?? [], response.totalPages);
    } catch (cause) {
      setEarlierError(toErrorMessage(cause, "Could not load earlier messages."));
    } finally {
      earlierRequestInFlight.current = false;
      setLoadingEarlier(false);
    }
  }, [storeOlderPage]);

  const archiveMessages = useCallback((ids: string[]) => {
    setPreviousChatIds((current) => addIds(current, ids));
  }, []);

  return {
    messages,
    setMessages,
    previousChatIds,
    archiveMessages,
    loading,
    loadError,
    reload,
    hasEarlier,
    loadingEarlier,
    earlierError,
    loadEarlier: () => void loadEarlier(),
  };
}
