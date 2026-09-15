import Image from "next/image";
import { DocumentIcon } from "@/components/icons";

const PREVIEW_SURFACE = "rounded-[2cqw] bg-bg-app dark:bg-dark-bg-app";

export function PhotoPreview({ isHovered = false }: { isHovered?: boolean }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2cqw] ring-1 ring-black/5 dark:ring-white/10">
      <Image
        src="/home/photo-log-thumb.png"
        alt=""
        fill
        sizes="12rem"
        className={`object-cover transition-all duration-500 ease-out ${
          isHovered ? "scale-110 brightness-[1.04]" : "scale-100"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-tr from-accent/20 via-transparent to-white/20 transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export function ChatPreview({ isHovered = false }: { isHovered?: boolean }) {
  return (
    <div
      className={`${PREVIEW_SURFACE} px-[1.2cqw] py-[1.4cqw] transition-all duration-300 ${
        isHovered
          ? "border border-accent/40 dark:border-accent-dark/50 bg-bg-surface/90 dark:bg-dark-bg/90 shadow-sm"
          : "border border-transparent"
      }`}
    >
      <p
        className={`line-clamp-3 text-[2cqw] font-light leading-snug transition-colors duration-200 ${
          isHovered
            ? "text-text-primary dark:text-dark-text"
            : "text-text-secondary dark:text-dark-text-secondary"
        }`}
      >
        &ldquo;I had a quinoa chickpea bowl for lunch&rdquo;
      </p>
    </div>
  );
}

export function ManualPreview({ isHovered = false }: { isHovered?: boolean }) {
  return (
    <div
      className={`${PREVIEW_SURFACE} space-y-[1.4cqw] px-[1.8cqw] py-[1.9cqw] transition-all duration-300 ${
        isHovered
          ? "border border-accent/40 dark:border-accent-dark/50 bg-bg-surface/90 dark:bg-dark-bg/90"
          : "border border-transparent"
      }`}
    >
      {["w-full", "w-4/5", "w-3/5"].map((lineWidth, index) => (
        <div key={lineWidth} className="flex items-center gap-[1.2cqw]">
          <span
            className={`h-[1.6cqw] w-[1.6cqw] shrink-0 rounded-full transition-all duration-300 ${
              isHovered
                ? "bg-accent dark:bg-accent-dark scale-125 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                : "bg-accent/50 dark:bg-accent-dark/50"
            }`}
            style={{ transitionDelay: isHovered ? `${index * 50}ms` : "0ms" }}
          />
          <span
            className={`h-[1cqw] rounded-full transition-all duration-300 ${
              isHovered
                ? "bg-text-secondary/70 dark:bg-dark-text-secondary/90"
                : "bg-border dark:bg-dark-border"
            } ${lineWidth}`}
          />
        </div>
      ))}
    </div>
  );
}

export function PdfPreview({ isHovered = false }: { isHovered?: boolean }) {
  return (
    <div
      className={`${PREVIEW_SURFACE} flex aspect-[4/3] items-center justify-center transition-all duration-300 ${
        isHovered
          ? "border border-accent/40 dark:border-accent-dark/50 bg-bg-surface/90 dark:bg-dark-bg/90 shadow-sm"
          : "border border-transparent"
      }`}
    >
      <DocumentIcon
        className={`h-[6.5cqw] w-[6.5cqw] transition-all duration-300 ${
          isHovered
            ? "text-accent dark:text-accent-dark scale-115 drop-shadow-[0_2px_8px_rgba(52,211,153,0.5)] -rotate-3"
            : "text-text-secondary dark:text-dark-text-secondary scale-100"
        }`}
      />
    </div>
  );
}
