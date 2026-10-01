"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

/** New shares should surface without a reload, but the badge is not worth a socket. */
const POLL_INTERVAL_MS = 60_000;

interface UnseenSharesValue {
  /** How many meals shared with the current user they have not seen yet. */
  unseenCount: number;
  /** Marks shares as seen and refreshes the count. Resolves false if the server refused. */
  markSeen: (shareIds: string[]) => Promise<boolean>;
}

const UnseenSharesContext = createContext<UnseenSharesValue | null>(null);

/**
 * Keeps the unseen-share count for the sidebar badge, refreshed on navigation,
 * on window focus and on a slow poll. A failed refresh keeps the last count: the
 * badge is a hint, and the next refresh retries, so an error screen would only
 * get in the way of whatever page the user is on.
 */
export function UnseenSharesProvider({ children }: { children: ReactNode }) {
  const [unseenCount, setUnseenCount] = useState(0);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const response = await api.getUnseenShareCount();
      setUnseenCount(response.data?.count ?? 0);
    } catch {
      // Keep the last known count; see the note above.
    }
  }, []);

  useEffect(() => {
    // The only state write happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  const markSeen = useCallback(
    async (shareIds: string[]) => {
      try {
        await api.markSharesSeen(shareIds);
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh]
  );

  const value = useMemo(() => ({ unseenCount, markSeen }), [unseenCount, markSeen]);

  return <UnseenSharesContext.Provider value={value}>{children}</UnseenSharesContext.Provider>;
}

export function useUnseenShares(): UnseenSharesValue {
  const value = useContext(UnseenSharesContext);
  if (!value) throw new Error("useUnseenShares must be used inside UnseenSharesProvider");
  return value;
}
