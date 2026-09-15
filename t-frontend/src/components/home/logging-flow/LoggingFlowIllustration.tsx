import { AssistantIcon, CameraIcon, DocumentIcon, EditIcon } from "@/components/icons";
import FlowArrows from "./FlowArrows";
import { FlowPrompt, FlowResult } from "./FlowOutcome";
import SourceCard from "./SourceCard";
import { ChatPreview, ManualPreview, PdfPreview, PhotoPreview } from "./SourcePreviews";

/**
 * Four ways to log converging on one result. Built from markup rather than a
 * bitmap so it stays sharp, follows the theme, and every size is in cqw so the
 * scene scales as a single unit from phone to desktop.
 */
export default function LoggingFlowIllustration() {
  return (
    <div
      role="img"
      aria-label="Photo, chat, manual, and PDF entries all flow into one prompt and produce a single quinoa chickpea bowl entry of 528 kcal with its macros"
      className="@container w-full"
    >
      <div className="relative aspect-[100/88] w-full">
        <FlowArrows />
        <SourceCard label="Photo" Icon={CameraIcon} placement={{ left: 0, top: 14, width: 21.5, rotate: -7 }} delayMs={80}>
          <PhotoPreview />
        </SourceCard>
        <SourceCard label="Chat" Icon={AssistantIcon} placement={{ left: 24.5, top: 2, width: 21.5, rotate: -3 }} delayMs={160}>
          <ChatPreview />
        </SourceCard>
        <SourceCard label="Manual" Icon={EditIcon} placement={{ left: 54, top: 2, width: 21.5, rotate: 3 }} delayMs={240}>
          <ManualPreview />
        </SourceCard>
        <SourceCard label="PDF" Icon={DocumentIcon} placement={{ left: 78.5, top: 14, width: 21.5, rotate: 7 }} delayMs={320}>
          <PdfPreview />
        </SourceCard>
        <FlowPrompt />
        <FlowResult />
      </div>
    </div>
  );
}
