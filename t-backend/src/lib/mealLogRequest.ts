import { FoodItemUnit, MealType } from '../models/FoodEntry';
import {
  ARTICLES,
  ENGLISH_QUESTION_START,
  FILLER_WORDS,
  FOOD_SEPARATORS,
  LOG_WORDS,
  MEAL_POSTPOSITIONS,
  MEAL_PREPOSITIONS,
  MEAL_WORDS,
  NUMBER_WORDS,
  OTHER_DAY_WORDS,
  QUESTION_WORDS,
  SEPARATOR_LEAD_INS,
  TIMES_OF_DAY,
  UNIT_WORDS,
  YESTERDAY_WORDS,
} from './mealLogVocabulary';

/**
 * Reads a chat message as a plain "log these foods" request without a model
 * call, so a meal the user has logged before can be proposed from their
 * catalogue. It is deliberately strict: anything it cannot fully account for
 * (a question, a date other than today or yesterday, a word that is not part
 * of a food name) makes it return null, and the message goes to the model.
 * English, Hinglish and Devanagari phrasing are all read the same way.
 */

export interface RequestedAmount {
  quantity: number;
  unit: FoodItemUnit;
}

export interface RequestedFood {
  /** The food's name, normalised the same way catalogue names are. */
  key: string;
  /** Absent when the user gave no amount: the last logged portion is reused. */
  amount?: RequestedAmount;
}

export interface MealLogRequest {
  mealType?: MealType;
  daysAgo: 0 | 1;
  /** The whole food phrase as one name, for a dish whose name contains "and" or "with". Absent when it has amounts. */
  wholeKey?: string;
  foods: RequestedFood[];
}

const NUMBER_WITH_UNIT = /^(\d+(?:\.\d+)?)([a-z]*)$/;

function toTokens(text: string): string[] {
  return (
    text
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[,&+/]/g, ' and ')
      .replace(/\.(?!\d)/g, ' ')
      // Letters and combining marks of any script, so Devanagari names keep their vowel signs.
      .replace(/[^\p{L}\p{M}\p{N}.\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );
}

/** Plural and singular spellings meet in the middle, so "Rotis" and "roti" share a key. */
function toSingular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('oes')) return word.slice(0, -2);
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** The key a food name is stored and matched under: lowercase, singular, without articles or punctuation. */
export function normaliseFoodName(name: string): string {
  return toTokens(name)
    .filter((word) => !ARTICLES.has(word))
    .map(toSingular)
    .join(' ');
}

/**
 * Removes the one meal the message names, with its "for my" lead-in or its
 * "mein" / "ke liye" follow-on. Two different meals is null.
 */
function extractMealType(tokens: string[]): { mealType?: MealType; rest: string[] } | null {
  const named = new Set(tokens.map((word) => MEAL_WORDS[word]).filter(Boolean));
  if (named.size > 1) return null;

  const rest: string[] = [];
  let followsMealWord = false;
  for (const word of tokens) {
    if (followsMealWord && MEAL_POSTPOSITIONS.has(word)) continue;
    followsMealWord = Boolean(MEAL_WORDS[word]);
    if (!followsMealWord) {
      rest.push(word);
      continue;
    }
    if (rest.at(-1) === 'my') rest.pop();
    if (MEAL_PREPOSITIONS.has(rest.at(-1) ?? '')) rest.pop();
  }
  return { mealType: [...named][0], rest };
}

/** Drops "this morning" style phrases, which only restate that the meal was today. */
function dropTimesOfDay(tokens: string[]): string[] {
  return tokens.filter((word, index) => {
    if (TIMES_OF_DAY.has(word)) return false;
    return !(word === 'this' && TIMES_OF_DAY.has(tokens[index + 1] ?? ''));
  });
}

function splitFoods(tokens: string[]): string[][] {
  const foods: string[][] = [[]];
  for (const word of tokens) {
    const current = foods[foods.length - 1];
    if (!FOOD_SEPARATORS.has(word)) {
      current.push(word);
      continue;
    }
    if (SEPARATOR_LEAD_INS.has(current.at(-1) ?? '')) current.pop();
    foods.push([]);
  }
  return foods;
}

/** Reads "200g", "200 g", "2" or "two" at the given end of a food's words. */
function readAmount(words: string[]): { amount: RequestedAmount; used: number } | undefined {
  const [first, second] = words;
  const wordNumber = NUMBER_WORDS[first];
  const numeric = NUMBER_WITH_UNIT.exec(first);
  const value = wordNumber ?? (numeric ? Number(numeric[1]) : undefined);
  if (value === undefined || !(value > 0)) return undefined;

  const attachedUnit = numeric?.[2];
  if (attachedUnit) {
    const unit = UNIT_WORDS[attachedUnit];
    return unit
      ? { amount: { quantity: value * unit.factor, unit: unit.unit }, used: 1 }
      : undefined;
  }
  const separateUnit = second === undefined ? undefined : UNIT_WORDS[second];
  if (separateUnit)
    return { amount: { quantity: value * separateUnit.factor, unit: separateUnit.unit }, used: 2 };
  return { amount: { quantity: value, unit: 'count' }, used: 1 };
}

/** Reads an amount written after the food: "rice 200g", "rice 200 g" or "eggs 2". */
function readTrailingAmount(
  words: string[]
): { amount: RequestedAmount; used: number } | undefined {
  const last = words.at(-1);
  if (last !== undefined && UNIT_WORDS[last] && words.length >= 2)
    return readAmount(words.slice(-2));
  return readAmount(words.slice(-1));
}

/** One food's words as a name and an amount written before it ("2 roti") or after it ("rice 200 g"). */
function toRequestedFood(words: string[]): RequestedFood | null {
  const leading = readAmount(words);
  const trailing = leading ? undefined : readTrailingAmount(words);
  const nameWords = leading
    ? words.slice(leading.used)
    : words.slice(0, words.length - (trailing?.used ?? 0));

  const key = normaliseFoodName(nameWords.join(' '));
  if (!key || /\d/.test(key)) return null;
  return { key, amount: (leading ?? trailing)?.amount };
}

function readDay(tokens: string[]): 0 | 1 | null {
  if (tokens.some((word) => OTHER_DAY_WORDS.has(word))) return null;
  return tokens.some((word) => YESTERDAY_WORDS.has(word)) ? 1 : 0;
}

/** The foods, meal and day a message asks to log, or null when it is anything more than that. */
export function parseMealLogRequest(message: string): MealLogRequest | null {
  const text = message.trim().toLowerCase();
  if (!text || text.includes('?') || ENGLISH_QUESTION_START.test(text)) return null;

  const tokens = toTokens(text);
  if (tokens.some((word) => QUESTION_WORDS.has(word))) return null;
  const daysAgo = readDay(tokens);
  const meal = daysAgo === null ? null : extractMealType(tokens);
  if (daysAgo === null || !meal) return null;

  const asksToLog = Boolean(meal.mealType) || tokens.some((word) => LOG_WORDS.has(word));
  if (!asksToLog) return null;

  const foodWords = dropTimesOfDay(meal.rest).filter((word) => !FILLER_WORDS.has(word));
  // Empty groups come from an Oxford comma ("eggs, toast, and tea"), not from a missing food.
  const foods = splitFoods(foodWords)
    .filter((words) => words.length > 0)
    .map(toRequestedFood);
  if (foods.length === 0 || foods.some((food) => food === null)) return null;

  const requested = foods as RequestedFood[];
  const hasAmounts = requested.some((food) => food.amount);
  return {
    mealType: meal.mealType,
    daysAgo,
    wholeKey: hasAmounts ? undefined : normaliseFoodName(foodWords.join(' ')),
    foods: requested,
  };
}

/** The meal a message with none named most likely means, by the same hours the assistant uses. */
export function mealTypeAtLocalTime(localTime: string | undefined): MealType | undefined {
  if (!localTime) return undefined;
  const hour = Number(localTime.slice(0, 2));
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 19) return 'snack';
  return 'dinner';
}
