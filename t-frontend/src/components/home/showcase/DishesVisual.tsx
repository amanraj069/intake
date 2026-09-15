"use client";

import { useInViewOnce } from "@/hooks/useInViewOnce";

const DISHES = [
  { name: "Roti", quantity: "2 count", calories: 240 },
  { name: "Paneer sabji", quantity: "200 g", calories: 380 },
  { name: "Cucumber raita", quantity: "120 g", calories: 90 },
] as const;

const ROW_STAGGER_MS = 90;
const TOTAL_DELAY_MS = DISHES.length * ROW_STAGGER_MS + 150;

export default function DishesVisual() {
  const { ref, isVisible } = useInViewOnce<HTMLDivElement>();
  const total = DISHES.reduce((sum, dish) => sum + dish.calories, 0);

  return (
    <div ref={ref} className="rounded-xl bg-bg-app dark:bg-dark-bg-app p-2.5 sm:p-5">
      <p className="text-[11px] sm:text-sm font-semibold text-text-primary dark:text-dark-text">Roti sabji thali</p>
      <ul className="mt-1.5 sm:mt-3 divide-y divide-border/70 dark:divide-dark-border">
        {DISHES.map((dish, index) => (
          <li
            key={dish.name}
            className={`flex items-baseline justify-between py-1 sm:py-2.5 text-[11px] sm:text-sm transition-all duration-400 ease-out ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1.5"
            }`}
            style={{ transitionDelay: `${index * ROW_STAGGER_MS}ms` }}
          >
            <span className="text-text-primary dark:text-dark-text">
              {dish.name}
              <span className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs font-light text-text-secondary dark:text-dark-text-secondary">{dish.quantity}</span>
            </span>
            <span className="tabular-nums font-light text-text-secondary dark:text-dark-text-secondary">{dish.calories} kcal</span>
          </li>
        ))}
      </ul>
      <div
        className={`mt-1 sm:mt-2 flex items-baseline justify-between border-t border-border dark:border-dark-border pt-1.5 sm:pt-3 transition-opacity duration-400 ease-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDelay: `${TOTAL_DELAY_MS}ms` }}
      >
        <span className="text-[10px] sm:text-xs font-medium text-text-secondary dark:text-dark-text-secondary">Meal total</span>
        <span className="text-sm sm:text-lg font-extrabold tabular-nums text-text-primary dark:text-dark-text">{total} kcal</span>
      </div>
    </div>
  );
}
