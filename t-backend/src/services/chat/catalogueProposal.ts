import { CalendarDay, daysBefore } from '../../lib/calendarDay';
import {
  MealLogRequest,
  RequestedFood,
  mealTypeAtLocalTime,
  parseMealLogRequest,
} from '../../lib/mealLogRequest';
import { roundToDecimals, roundToTenth } from '../../lib/numbers';
import { FoodItemInput } from '../../schemas/foodEntry.schema';
import {
  CatalogueDish,
  CatalogueItem,
  findCatalogueDishes,
  findCatalogueItems,
} from '../mealCatalog.service';
import { previewLogMeal } from './actionPreview';
import { PendingChatAction } from './chatToolTypes';
import { logMealArgsSchema } from './writeTools';

/**
 * Proposes a meal the user has logged before straight from their catalogue,
 * so a repeat "log my usual" costs no model call. The proposal is the same
 * pending logMeal action the model's tool would produce, confirmed or
 * cancelled on the same card.
 */

/** Matches the precision `sumItemNutrition` keeps for micronutrients. */
const MICRO_AMOUNT_DECIMALS = 3;

function scaleItem(item: CatalogueItem, quantity: number): FoodItemInput {
  const factor = quantity / item.quantity;
  const micros = Object.fromEntries(
    Object.entries(item.micros ?? {}).map(([name, micro]) => [
      name,
      { amount: roundToDecimals(micro.amount * factor, MICRO_AMOUNT_DECIMALS), unit: micro.unit },
    ])
  );
  return {
    name: item.name,
    unit: item.unit,
    quantity,
    calories: roundToTenth(item.calories * factor),
    macros: {
      proteinG: roundToTenth(item.macros.proteinG * factor),
      carbG: roundToTenth(item.macros.carbG * factor),
      fatG: roundToTenth(item.macros.fatG * factor),
    },
    micros,
  };
}

/**
 * The dish's foods at the dish's own quantities times the servings asked for,
 * priced from each linked item's latest portion.
 */
function dishItems(dish: CatalogueDish, servings = 1): FoodItemInput[] | undefined {
  const items = dish.components.map(({ item, quantity }) =>
    item && item.quantity > 0 ? scaleItem(item, quantity * servings) : undefined
  );
  return items.every((item) => item !== undefined) ? items : undefined;
}

/**
 * The catalogue entries a name means. Its own name always wins. A synonym
 * only counts when it points at a single food, so a name the model gave two
 * different foods (two kinds of "dal") is left to the model to tell apart.
 */
function entriesNamed<TEntry extends { key: string; synonyms?: string[] }>(
  entries: TEntry[],
  key: string
): TEntry[] {
  const exact = entries.filter((entry) => entry.key === key);
  if (exact.length > 0) return exact;
  const bySynonym = entries.filter((entry) => entry.synonyms?.includes(key));
  return new Set(bySynonym.map((entry) => entry.key)).size === 1 ? bySynonym : [];
}

/**
 * A food with no amount is its most recently logged portion. A food with an
 * amount is rescaled from the item logged in that unit, whatever portion was
 * logged ("1 roti" from 3 rotis is a third of everything); a count cannot
 * become grams without guessing, so a food never logged in that unit has no item.
 */
function itemFor(food: RequestedFood, items: CatalogueItem[]): FoodItemInput | undefined {
  const candidates = entriesNamed(items, food.key).filter((item) => item.quantity > 0);
  if (!food.amount) return candidates[0] && scaleItem(candidates[0], candidates[0].quantity);

  const { quantity, unit } = food.amount;
  const sameUnit = candidates.find((item) => item.unit === unit);
  return sameUnit && scaleItem(sameUnit, quantity);
}

/** A dish can be asked for by name alone, or by a count of servings ("half roti sabji"). */
function canBeDish(food: RequestedFood): boolean {
  return !food.amount || food.amount.unit === 'count';
}

/** Names a whole dish can be found under: the full phrase, and each food that could be a dish. */
function dishKeys(request: MealLogRequest): string[] {
  const foodKeys = request.foods.filter(canBeDish).map((food) => food.key);
  return request.wholeKey ? [request.wholeKey, ...foodKeys] : foodKeys;
}

interface ResolvedFood {
  items: FoodItemInput[];
  dish?: CatalogueDish;
}

/**
 * A food with no amount is a dish when one is named so, else an item. A food
 * with an amount is an item first, since "2 roti" means two rotis; only when
 * no item fits does a count become servings of a dish.
 */
function resolveFood(
  food: RequestedFood,
  dishNamed: (key: string) => CatalogueDish | undefined,
  items: CatalogueItem[]
): ResolvedFood | undefined {
  const dish = canBeDish(food) ? dishNamed(food.key) : undefined;
  const dishServings = dish && dishItems(dish, food.amount?.quantity ?? 1);
  if (dish && dishServings && !food.amount) return { items: dishServings, dish };

  const item = itemFor(food, items);
  if (item) return { items: [item] };
  return dish && dishServings ? { items: dishServings, dish } : undefined;
}

type ResolvedMeal = { name?: string; items: FoodItemInput[] };

/**
 * Dishes are looked up first. Only the foods no dish answered outright, and
 * any food with an amount, fall through to the item lookup, so a message that
 * names a saved dish never reads the items collection beyond the dish's own
 * links. Names and synonyms match alike. Null unless every food is in the catalogue.
 */
async function resolveFromCatalogue(
  userId: string,
  request: MealLogRequest
): Promise<ResolvedMeal | null> {
  const dishes = await findCatalogueDishes(userId, dishKeys(request));
  const dishNamed = (key: string) => entriesNamed(dishes, key)[0];

  const wholeDish = request.wholeKey ? dishNamed(request.wholeKey) : undefined;
  const wholeDishItems = wholeDish && dishItems(wholeDish);
  if (wholeDish && wholeDishItems) return { name: wholeDish.name, items: wholeDishItems };

  const needsItems = request.foods.filter((food) => food.amount || !dishNamed(food.key));
  const items = await findCatalogueItems(userId, [...new Set(needsItems.map((food) => food.key))]);

  const resolved = request.foods.map((food) => resolveFood(food, dishNamed, items));
  if (resolved.some((food) => !food)) return null;

  const foods = resolved as ResolvedFood[];
  const singleDish = foods.length === 1 ? foods[0].dish : undefined;
  return { name: singleDish?.name, items: foods.flatMap((food) => food.items) };
}

export interface CatalogueClock {
  today: CalendarDay;
  localTime?: string;
}

/**
 * A `logMeal` proposal built entirely from foods the user logged before, or
 * null when the message needs the model: it is not a plain log request, it
 * names a food the catalogue does not have, or its meal cannot be told. The
 * proposal passes the same validation the logMeal tool applies.
 */
export async function proposeMealFromCatalogue(
  userId: string,
  message: string,
  clock: CatalogueClock
): Promise<PendingChatAction | null> {
  const request = parseMealLogRequest(message);
  const mealType = request?.mealType ?? mealTypeAtLocalTime(clock.localTime);
  if (!request || !mealType) return null;

  try {
    const resolved = await resolveFromCatalogue(userId, request);
    if (!resolved) return null;

    const date = daysBefore(clock.today, request.daysAgo);
    const parsed = logMealArgsSchema.safeParse({ mealType, date, source: 'ai-chat', ...resolved });
    if (!parsed.success) return null;

    const preview = `From your saved meals: ${previewLogMeal(parsed.data, clock.today)}`;
    return { tool: 'logMeal', args: parsed.data, preview };
  } catch (error) {
    // The model can still answer, so a catalogue failure costs one model call, never the reply.
    console.error('[MealCatalog] Lookup failed, asking the assistant instead:', error);
    return null;
  }
}
