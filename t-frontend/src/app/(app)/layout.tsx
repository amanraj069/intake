"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { UnseenSharesProvider } from "@/contexts/UnseenSharesContext";

/** Screens that manage their own scrolling and take the whole viewport, unpadded. */
const FULL_HEIGHT_ROUTES = ["/chat"];

/**
 * One shell for every signed-in page. Living in a layout rather than each page
 * keeps the sidebar mounted across navigation, so moving between sections does
 * not re-run the auth check, reset the sidebar or flash an empty screen.
 */
export default function SignedInLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fullHeight = FULL_HEIGHT_ROUTES.includes(pathname);

  return (
    <ProtectedRoute>
      <UnseenSharesProvider>
        <DashboardLayout fullHeight={fullHeight}>{children}</DashboardLayout>
      </UnseenSharesProvider>
    </ProtectedRoute>
  );
}
