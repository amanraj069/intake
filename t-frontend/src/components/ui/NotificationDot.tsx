type NotificationDotSize = "sm" | "md";

interface NotificationDotProps {
  /** Read by screen readers in place of the dot, e.g. "New". */
  label: string;
  /** `sm` sits as a superscript beside text; `md` marks the corner of an icon. */
  size?: NotificationDotSize;
  className?: string;
}

const SIZES: Record<NotificationDotSize, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
};

/** A small red dot marking something the user has not seen yet. */
export default function NotificationDot({ label, size = "md", className = "" }: NotificationDotProps) {
  return (
    <span className={`inline-block shrink-0 rounded-full bg-error dark:bg-error-dark ${SIZES[size]} ${className}`}>
      <span className="sr-only">{label}</span>
    </span>
  );
}
