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

const DURATION = 3000;

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
  const [exiting, setExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Wait for transition to finish
  }, [onDismiss, toast.id]);

  useEffect(() => {
    // Next frame, so the element paints off-screen before it slides in.
    const raf = requestAnimationFrame(() => setEntered(true));
    const timer = setTimeout(handleDismiss, DURATION);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [handleDismiss]);

  const isError = toast.variant === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={[
        "pointer-events-auto flex items-start rounded-xl bg-bg-card dark:bg-dark-bg-card",
        "border border-border dark:border-dark-border",
        "shadow-lg",
        "transition-all duration-300 ease-out",
        entered && !exiting ? "translate-x-0 opacity-100 scale-100" : "translate-x-4 opacity-0 scale-95",
      ].join(" ")}
    >
      <div className="flex-1 px-4 py-3 sm:px-5 sm:py-4">
        <p className={`text-[10px] font-bold   ${isError ? "text-error dark:text-error-dark" : "text-success dark:text-success-dark"}`}>
          {isError ? "Error" : "Success"}
        </p>
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-text-primary dark:text-dark-text">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 cursor-pointer p-2 m-2 rounded-full text-text-secondary transition-colors duration-150 hover:bg-bg-app dark:hover:bg-dark-bg-app dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
