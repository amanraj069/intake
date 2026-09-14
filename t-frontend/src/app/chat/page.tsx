"use client";

import ChatThread from "@/components/chat/ChatThread";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout fullHeight>
        <ChatThread />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
