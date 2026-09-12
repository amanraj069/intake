"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "intake:sidebar-expanded";

/** Below this width the sidebar is the slide-in drawer, not a permanent rail. */
const DRAWER_QUERY = "(max-width: 1023px)";

export interface SidebarExpansion {
  /** True when nav labels are shown; always true in drawer mode. */
  expanded: boolean;
  /** True when the sidebar is presented as an overlay drawer rather than a permanent column. */
  isDrawer: boolean;
  /** False during server render and first paint, so width can skip an entry animation. */
  hydrated: boolean;
  toggle: () => void;
}

function subscribeToViewport(onChange: () => void): () => void {
  const query = window.matchMedia(DRAWER_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStoredPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    // Private browsing and blocked site data both throw here; the default is fine.
    return true;
  }
}

function writeStoredPreference(expanded: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(expanded));
  } catch {
    // A failed write only costs the preference on the next visit.
  }
}

/**
 * Owns whether the permanent sidebar shows labels or only its icon rail.
 *
 * Retracting is a desktop-only idea: in drawer mode the sidebar is already
 * hidden until summoned, so it always opens with labels and the preference is
 * neither read nor written at that width.
 *
 * Both the viewport and the stored preference are read through
 * `useSyncExternalStore` so the server snapshot stays stable and no render pass
 * is spent correcting state after mount.
 */
export function useSidebarExpansion(): SidebarExpansion {
  const isDrawer = useSyncExternalStore(
    subscribeToViewport,
    () => window.matchMedia(DRAWER_QUERY).matches,
    () => false
  );

  const storedExpanded = useSyncExternalStore(
    subscribeToStorage,
    readStoredPreference,
    () => true
  );

  const hydrated = useSyncExternalStore(subscribeToStorage, () => true, () => false);

  // Set once the user works the control, and takes priority over the stored
  // preference for the rest of the visit.
  const [sessionChoice, setSessionChoice] = useState<boolean | null>(null);

  const expanded = isDrawer || (sessionChoice ?? storedExpanded);

  const toggle = useCallback(() => {
    const next = !expanded;
    setSessionChoice(next);
    writeStoredPreference(next);
  }, [expanded]);

  return { expanded, isDrawer, hydrated, toggle };
}
