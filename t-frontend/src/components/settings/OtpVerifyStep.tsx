"use client";

import Button from "@/components/ui/Button";
import OtpField from "./OtpField";
import type { OtpFlow } from "@/hooks/useOtpFlow";

interface OtpVerifyStepProps {
  flow: OtpFlow;
  /** Wording for the button that commits the change. */
  confirmLabel: string;
}

/** The second step of both account changes: enter the mailed code, or back out. */
export default function OtpVerifyStep({ flow, confirmLabel }: OtpVerifyStepProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
        Enter the code sent to{" "}
        <span className="font-bold text-text-primary dark:text-dark-text">{flow.sentTo}</span>. It
        expires in 10 minutes.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="sm:w-52">
          <OtpField value={flow.otp} onChange={flow.setOtp} disabled={flow.busy} />
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={flow.busy} className="sm:h-[46px]">
            {confirmLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={flow.cancel}
            disabled={flow.busy}
            className="sm:h-[46px]"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
