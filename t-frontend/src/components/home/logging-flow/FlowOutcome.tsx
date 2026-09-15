import { SparkleIcon } from "@/components/icons";

const SOFT_SHADOW = "shadow-[0_12px_32px_-12px_rgba(41,37,36,0.28)] dark:shadow-none";

/** The dish in the Photo card. 19g x 4 + 68g x 4 + 20g x 9 = 528 kcal, so the sample adds up like a real entry. */
const LOGGED_MEAL = {
  name: "Quinoa chickpea bowl",
  calories: 528,
  macros: [
    { label: "Protein", grams: 19, dot: "bg-protein dark:bg-dark-protein" },
    { label: "Carbs", grams: 68, dot: "bg-carbs dark:bg-dark-carbs" },
    { label: "Fat", grams: 20, dot: "bg-fat dark:bg-dark-fat" },
  ],
} as const;

/** The shared prompt every input funnels into. */
export function FlowPrompt({ isHighlighted = false }: { isHighlighted?: boolean }) {
  return (
    <div
      className={`absolute left-[31cqw] top-[52cqw] flex h-[9cqw] w-[38cqw] items-center justify-center gap-[1.5cqw] rounded-[3cqw] bg-accent-muted dark:bg-accent-dark-muted text-white ${SOFT_SHADOW} animate-fade-up delay-350 transition-all duration-300 ${
        isHighlighted
          ? "scale-[1.04] ring-2 ring-accent dark:ring-[#34D399] shadow-[0_0_25px_rgba(52,211,153,0.35)]"
          : ""
      }`}
    >
      <SparkleIcon
        className={`h-[3.3cqw] w-[3.3cqw] transition-transform duration-300 ${
          isHighlighted ? "scale-125 rotate-12 text-[#34D399]" : ""
        }`}
      />
      <span className="text-[2.9cqw] font-medium">What did you eat?</span>
    </div>
  );
}

/** What comes out the other side: the photographed dish, named, with calories and macros. */
export function FlowResult({ isHighlighted = false }: { isHighlighted?: boolean }) {
  return (
    <div
      className={`absolute left-[21cqw] top-[69cqw] w-[58cqw] rounded-[3cqw] border bg-bg-card dark:bg-dark-bg-card px-[3cqw] py-[2.4cqw] ${SOFT_SHADOW} animate-fade-up delay-450 transition-all duration-300 ${
        isHighlighted
          ? "border-accent/80 dark:border-accent-dark/90 shadow-[0_0_28px_rgba(52,211,153,0.22)] scale-[1.01]"
          : "border-border/60 dark:border-dark-border"
      }`}
    >
      <div className="flex items-baseline justify-between gap-[2cqw]">
        <p className="truncate text-[2.8cqw] font-semibold text-text-primary dark:text-dark-text">{LOGGED_MEAL.name}</p>
        <p className="shrink-0 text-[4.6cqw] font-extrabold leading-none tracking-tight tabular-nums text-text-primary dark:text-dark-text">
          {LOGGED_MEAL.calories}
          <span className="ml-[0.6cqw] text-[2.4cqw] font-light tracking-normal text-text-secondary dark:text-dark-text-secondary">kcal</span>
        </p>
      </div>
      <ul className="mt-[1.8cqw] flex justify-between border-t border-border/60 dark:border-dark-border pt-[1.6cqw]">
        {LOGGED_MEAL.macros.map(({ label, grams, dot }) => (
          <li key={label} className="flex items-center gap-[0.8cqw] text-[2.3cqw] font-light tabular-nums text-text-secondary dark:text-dark-text-secondary">
            <span className={`h-[1.2cqw] w-[1.2cqw] rounded-full ${dot}`} />
            <span className="font-semibold text-text-primary dark:text-dark-text">{grams}g</span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
