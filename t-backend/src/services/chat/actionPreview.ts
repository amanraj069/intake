import { CalendarDay, daysBefore } from '../../lib/calendarDay';
import { roundToTenth } from '../../lib/numbers';
import { IGoalDocument } from '../../models/Goal';
import { CreateFoodEntryInput, FoodItemInput } from '../../schemas/foodEntry.schema';
import { UpsertGoalInput } from '../../schemas/goal.schema';
import { sumItemNutrition } from '../../lib/foodItemTotals';

/**
 * The one-line description of a proposed write, shown on its action card and
 * stored as the assistant's reply, so the card reads the same after a refresh.
 */

function formatWholeNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function describeDay(day: string, today: CalendarDay): string {
  const calendarDay = day.slice(0, 10);
  if (calendarDay === today) return 'today';
  if (calendarDay === daysBefore(today, 1)) return 'yesterday';
  return calendarDay;
}

function describeItem(item: FoodItemInput): string {
  if (item.unit === 'count') return `${item.name} x${roundToTenth(item.quantity)}`;
  return `${item.name} (${formatWholeNumber(item.quantity)} ${item.unit})`;
}

function describeItemsNutrition(items: readonly FoodItemInput[]): string {
  const totals = sumItemNutrition(items);
  const { proteinG, carbG, fatG } = totals.macros;
  const list = items.map(describeItem).join(', ');
  return `${list}: ${formatWholeNumber(totals.calories)} kcal (protein ${roundToTenth(proteinG)} g, carbs ${roundToTenth(carbG)} g, fat ${roundToTenth(fatG)} g)`;
}

export function previewLogMeal(entry: CreateFoodEntryInput, today: CalendarDay): string {
  return `Log ${entry.mealType} for ${describeDay(entry.date, today)}: ${describeItemsNutrition(entry.items)}`;
}

/**
 * The one-line description stored for a nutrition estimate: never persisted as
 * a meal, but kept as the reply's text so a later "log this" turn still has
 * the exact foods and numbers to reuse.
 */
export function previewNutritionEstimate(items: readonly FoodItemInput[]): string {
  return `Estimated nutrition: ${describeItemsNutrition(items)}`;
}

const GOAL_FIELDS: readonly { key: keyof UpsertGoalInput; label: string; unit: string }[] = [
  { key: 'dailyCalorieTarget', label: 'calories', unit: 'kcal' },
  { key: 'proteinTargetG', label: 'protein', unit: 'g' },
  { key: 'carbTargetG', label: 'carbs', unit: 'g' },
  { key: 'fatTargetG', label: 'fat', unit: 'g' },
  { key: 'weightGoalKg', label: 'weight goal', unit: 'kg' },
];

function describeGoalValue(value: number | undefined, unit: string): string {
  return value === undefined ? 'none' : `${formatWholeNumber(value)} ${unit}`;
}

/** Only the targets that change, each shown as "old to new", so a one-field edit reads as one. */
function describeGoalChanges(goal: UpsertGoalInput, previous: IGoalDocument | null): string {
  const changes = GOAL_FIELDS.filter(({ key }) => !previous || previous[key] !== goal[key]).map(
    ({ key, label, unit }) => {
      const next = describeGoalValue(goal[key], unit);
      return previous ? `${label} ${describeGoalValue(previous[key], unit)} to ${next}` : `${label} ${next}`;
    }
  );
  return changes.join(', ');
}

export function previewSetGoal(goal: UpsertGoalInput, previous: IGoalDocument | null): string {
  const verb = previous ? 'Update daily goal' : 'Set daily goal';
  return `${verb}: ${describeGoalChanges(goal, previous)}`;
}

export function goalValuesMatch(goal: UpsertGoalInput, previous: IGoalDocument | null): boolean {
  return Boolean(previous) && GOAL_FIELDS.every(({ key }) => previous?.[key] === goal[key]);
}
