import type { ComponentType, SVGProps } from "react";
import { ContrastIcon, ShieldIcon } from "@/components/icons";

export type SettingsSectionId = "security" | "appearance";

export interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/** The settings sections, in the order they read down the section rail. */
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: "security", label: "Security", Icon: ShieldIcon },
  { id: "appearance", label: "Appearance", Icon: ContrastIcon },
];
