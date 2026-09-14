"use client";

import { useEffect } from "react";
import ChatThread from "@/components/chat/ChatThread";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

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

  return (
    <ProtectedRoute>
      <DashboardLayout fullHeight>
        <ChatThread />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
