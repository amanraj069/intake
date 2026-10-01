"use client";

import { useState } from "react";
import ReceivedMealsList from "@/components/shared/ReceivedMealsList";
import SentMealsList from "@/components/shared/SentMealsList";
import OptionPills, { type PillOption } from "@/components/ui/OptionPills";
import PageHeader from "@/components/ui/PageHeader";

type ShareView = "received" | "sent";

const VIEW_OPTIONS: readonly PillOption<ShareView>[] = [
  { value: "received", label: "Shared with me" },
  { value: "sent", label: "Shared by me" },
];

export default function SharedPage() {
  const [view, setView] = useState<ShareView>("received");

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader
        title="Shared"
        description="Meals others have shared with you, and meals you have shared."
        hideDescriptionOnMobile
        stackOnMobile
        showBackButton
        action={
          <OptionPills
            label="Which shared meals to show"
            options={VIEW_OPTIONS}
            value={view}
            className="w-full sm:w-auto"
            onChange={setView}
          />
        }
      />
      {view === "received" ? <ReceivedMealsList /> : <SentMealsList />}
    </div>
  );
}
