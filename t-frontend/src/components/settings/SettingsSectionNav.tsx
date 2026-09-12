"use client";

import { SETTINGS_SECTIONS, type SettingsSectionId } from "./sections";

interface SettingsSectionNavProps {
  active: SettingsSectionId;
  onSelect: (section: SettingsSectionId) => void;
}

const CELL_CLASSES =
  "flex flex-1 items-center gap-3 px-5 py-4 text-left text-[11px] font-bold   transition-colors duration-100 cursor-pointer";

const SELECTED_CLASSES = "bg-text-primary text-bg-primary dark:bg-dark-text dark:text-dark-bg";

const UNSELECTED_CLASSES =
  "text-text-secondary hover:bg-black/5 hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-white/5 dark:hover:text-dark-text";

/**
 * Picks the settings section on show. It is one bordered strip that runs across
 * the top on narrow screens and down a rail beside the panel from `lg` up.
 */
export default function SettingsSectionNav({ active, onSelect }: SettingsSectionNavProps) {
  return (
    <nav
      aria-label="Settings sections"
      className="flex border border-border dark:border-dark-border lg:flex-col lg:self-start"
    >
      {SETTINGS_SECTIONS.map(({ id, label, Icon }, index) => {
        const selected = id === active;

        return (
          <button
            key={id}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={() => onSelect(id)}
            className={[
              CELL_CLASSES,
              // Separators only between cells, so the strip stays one block.
              index > 0
                ? "border-l border-border dark:border-dark-border lg:border-l-0 lg:border-t"
                : "",
              selected ? SELECTED_CLASSES : UNSELECTED_CLASSES,
            ].join(" ")}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
