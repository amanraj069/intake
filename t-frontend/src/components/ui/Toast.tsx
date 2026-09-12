"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error";

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, message: string) => {
    const id = nextId.current++;
    // Cap the stack so a burst of errors can't bury the page.
    setToasts((current) => [...current.slice(-2), { id, variant, message }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed top-[4.5rem] right-6 z-[100] flex w-[calc(100vw-3rem)] max-w-[380px] flex-col gap-3"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // Next frame, so the element paints off-screen before it slides in.
    const raf = requestAnimationFrame(() => setEntered(true));
    const timer = setTimeout(() => onDismiss(toast.id), DURATION);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss]);

  const isError = toast.variant === "error";

  const accentBar = isError
    ? "bg-accent dark:bg-accent-dark"
    : "bg-text-primary dark:bg-dark-text";

  const label = isError
    ? "text-accent dark:text-accent-dark"
    : "text-text-primary dark:text-dark-text";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={[
        "pointer-events-auto flex items-stretch border bg-bg-primary dark:bg-dark-bg",
        "border-black/10 dark:border-white/10",
        "shadow-[0_1px_0_0_rgba(0,0,0,0.04)]",
        "transition-transform transition-opacity duration-150 ease-out",
        entered ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
      ].join(" ")}
    >
      {/* Stark accent rule - the only colour in the surface */}
      <div className={`w-[3px] shrink-0 ${accentBar}`} aria-hidden="true" />

      <div className="flex-1 px-5 py-4">
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.2em] ${label}`}
        >
          {isError ? "Error" : "Success"}
        </p>
        <p className="mt-2 text-sm font-light leading-relaxed text-text-primary dark:text-dark-text">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 cursor-pointer border-l border-black/10 px-4 text-text-secondary transition-colors duration-150 hover:bg-text-primary hover:text-white dark:border-white/10 dark:text-dark-text-secondary dark:hover:bg-dark-text dark:hover:text-dark-bg"
      >
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
