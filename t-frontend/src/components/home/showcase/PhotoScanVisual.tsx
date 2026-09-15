import Meter from "@/components/ui/Meter";

const CONFIDENCE_FACTORS = [
  { label: "Food identity", score: 96 },
  { label: "Portion size", score: 84 },
  { label: "Nutrient accuracy", score: 91 },
  { label: "Image quality", score: 98 },
] as const;

/** The "Why?" breakdown the photo extractor shows beside every estimate. */
export default function PhotoScanVisual() {
  return (
    <div className="rounded-xl bg-bg-app dark:bg-dark-bg-app p-2.5 sm:p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] sm:text-xs font-medium text-text-secondary dark:text-dark-text-secondary">Confidence</p>
        <p className="text-lg sm:text-2xl font-extrabold tabular-nums text-calories dark:text-dark-calories">92%</p>
      </div>
      <ul className="mt-2 sm:mt-4 space-y-1.5 sm:space-y-3.5">
        {CONFIDENCE_FACTORS.map(({ label, score }) => (
          <li key={label}>
            <div className="mb-0.5 sm:mb-1.5 flex justify-between text-[10px] sm:text-xs">
              <span className="font-light text-text-secondary dark:text-dark-text-secondary">{label}</span>
              <span className="font-semibold tabular-nums text-text-primary dark:text-dark-text">{score}</span>
            </div>
            <Meter percent={score} ariaLabel={`${label}: ${score}`} colourClass="bg-calories dark:bg-dark-calories" />
          </li>
        ))}
      </ul>
    </div>
  );
}
