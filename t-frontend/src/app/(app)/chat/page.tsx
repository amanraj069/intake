"use client";

import { useEffect } from "react";
import ChatThread from "@/components/chat/ChatThread";

export default function ChatPage() {
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      const original = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
      return () => {
        window.history.scrollRestoration = original;
      };
    }
  }, []);

  return <ChatThread />;
}
