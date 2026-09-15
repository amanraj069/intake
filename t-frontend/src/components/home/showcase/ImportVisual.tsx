import Badge from "@/components/ui/Badge";

const IMPORTED_ROWS = [
  { item: "Oats with banana", status: "Ready", variant: "success" },
  { item: "Chicken biryani", status: "Estimated", variant: "warning" },
  { item: "Greek yogurt", status: "Duplicate", variant: "neutral" },
] as const;

export default function ImportVisual() {
  return (
    <ul className="space-y-1 sm:space-y-2">
      {IMPORTED_ROWS.map((row) => (
        <li
          key={row.item}
          className="flex items-center justify-between gap-2 rounded-lg sm:rounded-xl bg-bg-app dark:bg-dark-bg-app px-2.5 py-1.5 sm:px-4 sm:py-3 text-[11px] sm:text-sm"
        >
          <span className="truncate text-text-primary dark:text-dark-text">{row.item}</span>
          <Badge variant={row.variant}>{row.status}</Badge>
        </li>
      ))}
    </ul>
  );
}
