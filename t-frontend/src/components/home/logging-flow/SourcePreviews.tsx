import Image from "next/image";
import { DocumentIcon } from "@/components/icons";

const PREVIEW_SURFACE = "rounded-[2cqw] bg-bg-app dark:bg-dark-bg-app";

export function PhotoPreview() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2cqw]">
      <Image src="/home/photo-log-thumb.png" alt="" fill sizes="12rem" className="object-cover" />
    </div>
  );
}

export function ChatPreview() {
  return (
    <p className={`${PREVIEW_SURFACE} px-[1cqw] py-[1.4cqw] text-[2cqw] font-light leading-snug text-text-secondary dark:text-dark-text-secondary`}>
      &ldquo;I had a quinoa chickpea bowl for lunch&rdquo;
    </p>
  );
}

export function ManualPreview() {
  return (
    <div className={`${PREVIEW_SURFACE} space-y-[1.4cqw] px-[1.8cqw] py-[1.9cqw]`}>
      {["w-full", "w-4/5", "w-3/5"].map((lineWidth) => (
        <div key={lineWidth} className="flex items-center gap-[1.2cqw]">
          <span className="h-[1.6cqw] w-[1.6cqw] shrink-0 rounded-full bg-accent/50 dark:bg-accent-dark/50" />
          <span className={`h-[1cqw] rounded-full bg-border dark:bg-dark-border ${lineWidth}`} />
        </div>
      ))}
    </div>
  );
}

export function PdfPreview() {
  return (
    <div className={`${PREVIEW_SURFACE} flex aspect-[4/3] items-center justify-center`}>
      <DocumentIcon className="h-[6.5cqw] w-[6.5cqw] text-text-secondary dark:text-dark-text-secondary" />
    </div>
  );
}
