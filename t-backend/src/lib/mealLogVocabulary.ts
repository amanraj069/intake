import { FoodItemUnit, MealType } from '../models/FoodEntry';

/**
 * The words `parseMealLogRequest` understands around food names, in English,
 * Hinglish (Hindi in Latin script) and Devanagari. Food names themselves are
 * never listed here: they come from the user's catalogue and its synonyms.
 */

/** English questions start with these. `do` is left out: in Hinglish it is the number two. */
export const ENGLISH_QUESTION_START =
  /^(what|whats|how|is|are|can|could|should|does|did|which|why|when|will|would|tell|show|give)\b/;

/** Hindi puts its question word anywhere in the sentence ("roti mein kitni calorie hai"). */
export const QUESTION_WORDS = new Set([
  'kya', 'kitna', 'kitni', 'kitne', 'kaise', 'kyun', 'kyu', 'kaun', 'konsa', 'kaunsa',
  'क्या', 'कितना', 'कितनी', 'कितने', 'कैसे', 'क्यों', 'कौन', 'कौनसा',
]);

export const ARTICLES = new Set(['a', 'an', 'the', 'of', 'some']);

export const LOG_WORDS = new Set([
  'log', 'add', 'track', 'record', 'save', 'had', 'have', 'ate', 'eaten', 'eat', 'drank', 'drink', 'having',
  'khaya', 'khaaya', 'khayi', 'khaayi', 'khai', 'khaai', 'khaye', 'khaaye', 'piya', 'piyi', 'liya', 'lia', 'li',
  'खाया', 'खायी', 'खाई', 'खाए', 'खाये', 'पिया', 'पी', 'लिया', 'लॉग',
]);

export const FILLER_WORDS = new Set([
  ...LOG_WORDS,
  'i', 'ive', 'im', 'my', 'just', 'also', 'please', 'today', 'tonight', 'yesterday',
  'maine', 'mene', 'mainne', 'humne', 'aaj', 'abhi', 'hai', 'tha', 'thi', 'bhi',
  'मैंने', 'मैने', 'हमने', 'आज', 'अभी', 'है', 'था', 'थी', 'भी',
]);

export const YESTERDAY_WORDS = new Set(['yesterday']);

/**
 * Any of these points at a day this reader does not resolve, so the model
 * handles it. "kal" is here because it means both yesterday and tomorrow.
 */
export const OTHER_DAY_WORDS = new Set([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'tomorrow', 'ago', 'last', 'night', 'week', 'yday',
  'kal', 'parso', 'parson', 'कल', 'परसों',
]);

export const MEAL_WORDS: Record<string, MealType> = {
  breakfast: 'breakfast', nashta: 'breakfast', nashte: 'breakfast', naashta: 'breakfast',
  naashte: 'breakfast', नाश्ता: 'breakfast', नाश्ते: 'breakfast', ब्रेकफास्ट: 'breakfast',
  lunch: 'lunch', लंच: 'lunch',
  dinner: 'dinner', डिनर: 'dinner',
  snack: 'snack', snacks: 'snack', स्नैक: 'snack', स्नैक्स: 'snack',
};

/** English leads into a meal ("for lunch"). */
export const MEAL_PREPOSITIONS = new Set(['for', 'at', 'as', 'in', 'to', 'with']);

/** Hindi follows it ("lunch mein", "dinner ke liye"). */
export const MEAL_POSTPOSITIONS = new Set(['mein', 'me', 'main', 'ke', 'liye', 'ko', 'में', 'के', 'लिए', 'को']);

export const TIMES_OF_DAY = new Set(['morning', 'afternoon', 'evening']);

export const FOOD_SEPARATORS = new Set(['and', 'with', 'plus', 'aur', 'saath', 'sath', 'और', 'साथ']);

/** The "ke" of "dal ke saath" belongs to the separator, not to the food before it. */
export const SEPARATOR_LEAD_INS = new Set(['ke', 'के']);

export const NUMBER_WORDS: Record<string, number> = {
  half: 0.5, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  aadha: 0.5, adha: 0.5, ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5,
  आधा: 0.5, एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5,
};

export const UNIT_WORDS: Record<string, { unit: FoodItemUnit; factor: number }> = {
  g: { unit: 'g', factor: 1 },
  gm: { unit: 'g', factor: 1 },
  gms: { unit: 'g', factor: 1 },
  gram: { unit: 'g', factor: 1 },
  grams: { unit: 'g', factor: 1 },
  kg: { unit: 'g', factor: 1000 },
  kgs: { unit: 'g', factor: 1000 },
  ml: { unit: 'ml', factor: 1 },
  mls: { unit: 'ml', factor: 1 },
  l: { unit: 'ml', factor: 1000 },
  litre: { unit: 'ml', factor: 1000 },
  litres: { unit: 'ml', factor: 1000 },
  liter: { unit: 'ml', factor: 1000 },
  liters: { unit: 'ml', factor: 1000 },
  piece: { unit: 'count', factor: 1 },
  pieces: { unit: 'count', factor: 1 },
  pc: { unit: 'count', factor: 1 },
  pcs: { unit: 'count', factor: 1 },
};
