"use client";

import type { ComponentType, SVGProps } from "react";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { MoonIcon, SunIcon } from "@/components/icons";
import SettingsPanel from "./SettingsPanel";
import SettingsBlock from "./SettingsBlock";

interface ThemeChoice {
  value: Theme;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const THEME_CHOICES: readonly ThemeChoice[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
];

const CHOICE_CLASSES =
  "flex items-center justify-center gap-3 px-4 py-4 text-[11px] font-bold   transition-colors duration-100 cursor-pointer";

/** How the app looks. Only the theme for now, kept apart from account security. */
export default function AppearanceSettings() {
  const { theme, selectTheme } = useTheme();

  return (
    <SettingsPanel title="Appearance">
      <SettingsBlock
        title="Theme"
        description="Applies to this browser and is remembered the next time you open Intake."
      >
        <div
          role="radiogroup"
          aria-label="Theme"
          className="grid grid-cols-2 border border-input-border dark:border-dark-input-border sm:max-w-md"
        >
          {THEME_CHOICES.map(({ value, label, Icon }, index) => {
            const selected = theme === value;

            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectTheme(value)}
                className={[
                  CHOICE_CLASSES,
                  index > 0 ? "border-l border-input-border dark:border-dark-input-border" : "",
                  selected
                    ? "bg-text-primary text-bg-primary dark:bg-dark-text dark:text-dark-bg"
                    : "text-text-secondary hover:bg-black/5 hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-white/5 dark:hover:text-dark-text",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      </SettingsBlock>
    </SettingsPanel>
  );
}
