"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { api } from "@/lib/api";
import { prependOlderPage, toThreadMessage } from "@/lib/chatThread";
import { toErrorMessage } from "@/lib/errorMessage";
import type { ChatThreadMessage } from "@/types/chat";

export const CHAT_HISTORY_PAGE_SIZE = 20;

interface UseChatHistoryResult {
  messages: ChatThreadMessage[];
  setMessages: Dispatch<SetStateAction<ChatThreadMessage[]>>;
  loading: boolean;
  loadError: string | null;
  reload: () => void;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  earlierError: string | null;
  loadEarlier: () => void;
}

/**
 * Loads the stored thread, most recent page first, and prepends earlier pages
 * on request. The messages it holds are the thread's single source of truth;
 * `setMessages` lets the thread hook append live turns to the same list.
 */
export function useChatHistory(): UseChatHistoryResult {
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedPages, setLoadedPages] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [earlierError, setEarlierError] = useState<string | null>(null);

  const fetchLatestPage = useCallback(async () => {
    try {
      const response = await api.getChatHistory(1, CHAT_HISTORY_PAGE_SIZE);
      setMessages((response.data ?? []).slice().reverse().map((message) => toThreadMessage(message)));
      setLoadedPages(1);
      setTotalPages(response.totalPages);
      setLoadError(null);
    } catch (cause) {
      setLoadError(toErrorMessage(cause, "Could not load your conversation."));
    } finally {
      setLoading(false);
    }
  }, []);

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
    setLoadingEarlier(true);
    setEarlierError(null);

    try {
      const nextPage = loadedPages + 1;
      const response = await api.getChatHistory(nextPage, CHAT_HISTORY_PAGE_SIZE);
      setMessages((current) => prependOlderPage(current, response.data ?? []));
      setLoadedPages(nextPage);
      setTotalPages(response.totalPages);
    } catch (cause) {
      setEarlierError(toErrorMessage(cause, "Could not load earlier messages."));
    } finally {
      setLoadingEarlier(false);
    }
  }, [loadedPages]);

  return {
    messages,
    setMessages,
    loading,
    loadError,
    reload,
    hasEarlier: loadedPages > 0 && loadedPages < totalPages,
    loadingEarlier,
    earlierError,
    loadEarlier: () => void loadEarlier(),
  };
}
