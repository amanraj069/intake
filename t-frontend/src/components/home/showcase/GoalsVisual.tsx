import MacroRing from "@/components/chat/MacroRing";

export default function GoalsVisual() {
  return (
    <div>
      <p className="text-xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-text-primary dark:text-dark-text">
        2,200
        <span className="ml-1 text-[11px] sm:text-sm font-light text-text-secondary dark:text-dark-text-secondary">kcal a day</span>
      </p>
      <div className="mt-2 sm:mt-5 flex gap-1.5 sm:gap-2">
        <MacroRing nutrient="protein" current={112} target={140} />
        <MacroRing nutrient="carbs" current={176} target={240} />
        <MacroRing nutrient="fat" current={48} target={70} />
      </div>
    </div>
  );
}
