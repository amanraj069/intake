"use client";

import { useState } from "react";
import { AssistantIcon, CameraIcon, DocumentIcon, EditIcon } from "@/components/icons";
import FlowArrows, { type ActiveSource } from "./FlowArrows";
import { FlowPrompt, FlowResult } from "./FlowOutcome";
import SourceCard from "./SourceCard";
import { ChatPreview, ManualPreview, PdfPreview, PhotoPreview } from "./SourcePreviews";

/**
 * Four ways to log converging on one result. Built from markup rather than a
 * bitmap so it stays sharp, follows the theme, and every size is in cqw so the
 * scene scales as a single unit from phone to desktop.
 * Enhanced with interactive hover states that highlight cards, flow arrows, and prompt.
 */
export default function LoggingFlowIllustration() {
  const [activeSource, setActiveSource] = useState<ActiveSource>(null);

  return (
    <div
      role="img"
      aria-label="Photo, chat, manual, and PDF entries all flow into one prompt and produce a single quinoa chickpea bowl entry of 528 kcal with its macros"
      className="@container w-full"
    >
      <div className="relative aspect-[100/88] w-full">
        <FlowArrows activeSource={activeSource} />

        <SourceCard
          label="Photo"
          Icon={CameraIcon}
          placement={{ left: 0, top: 14, width: 21.5, rotate: -7 }}
          delayMs={80}
          isHovered={activeSource === "Photo"}
          isDimmed={activeSource !== null && activeSource !== "Photo"}
          onMouseEnter={() => setActiveSource("Photo")}
          onMouseLeave={() => setActiveSource(null)}
          onClick={() => setActiveSource((curr) => (curr === "Photo" ? null : "Photo"))}
        >
          <PhotoPreview isHovered={activeSource === "Photo"} />
        </SourceCard>

        <SourceCard
          label="Chat"
          Icon={AssistantIcon}
          placement={{ left: 24.5, top: 2, width: 21.5, rotate: -3 }}
          delayMs={160}
          isHovered={activeSource === "Chat"}
          isDimmed={activeSource !== null && activeSource !== "Chat"}
          onMouseEnter={() => setActiveSource("Chat")}
          onMouseLeave={() => setActiveSource(null)}
          onClick={() => setActiveSource((curr) => (curr === "Chat" ? null : "Chat"))}
        >
          <ChatPreview isHovered={activeSource === "Chat"} />
        </SourceCard>

        <SourceCard
          label="Manual"
          Icon={EditIcon}
          placement={{ left: 54, top: 2, width: 21.5, rotate: 3 }}
          delayMs={240}
          isHovered={activeSource === "Manual"}
          isDimmed={activeSource !== null && activeSource !== "Manual"}
          onMouseEnter={() => setActiveSource("Manual")}
          onMouseLeave={() => setActiveSource(null)}
          onClick={() => setActiveSource((curr) => (curr === "Manual" ? null : "Manual"))}
        >
          <ManualPreview isHovered={activeSource === "Manual"} />
        </SourceCard>

        <SourceCard
          label="PDF"
          Icon={DocumentIcon}
          placement={{ left: 78.5, top: 14, width: 21.5, rotate: 7 }}
          delayMs={320}
          isHovered={activeSource === "PDF"}
          isDimmed={activeSource !== null && activeSource !== "PDF"}
          onMouseEnter={() => setActiveSource("PDF")}
          onMouseLeave={() => setActiveSource(null)}
          onClick={() => setActiveSource((curr) => (curr === "PDF" ? null : "PDF"))}
        >
          <PdfPreview isHovered={activeSource === "PDF"} />
        </SourceCard>

        <FlowPrompt isHighlighted={activeSource !== null} />
        <FlowResult isHighlighted={activeSource !== null} />
      </div>
    </div>
  );
}
