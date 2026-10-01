import { IFoodEntryDocument } from '../models/FoodEntry';
import { SharedItem } from '../models/SharedItem';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { PaginatedResult, buildPaginatedResult, toSkipCount } from '../lib/pagination';
import { ListSharedMealsQuery, MarkSharesSeenInput, ShareMealInput } from '../schemas/sharedMeal.schema';
import { getFoodEntry } from './foodEntry.service';

/** The other person on a share, trimmed to what is needed to recognise them. */
export interface SharedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** A meal someone else shared with the current user. */
export interface SharedMeal {
  id: string;
  sharedAt: Date;
  sharedBy: SharedUser;
  /** False until the recipient has seen this share on their Shared page. */
  seen: boolean;
  meal: IFoodEntryDocument;
}

export interface UserFields {
  _id: { toString(): string };
  email: string;
  firstName?: string;
  lastName?: string;
}

async function findRecipientIdByEmail(email: string): Promise<string> {
  const recipient = await User.findOne({ email }).select('_id').lean();

  if (!recipient) {
    throw new AppError('No account exists with that email address', 404, 'RECIPIENT_NOT_FOUND');
  }

  return recipient._id.toString();
}

async function assertNotAlreadyShared(recipientId: string, mealId: string): Promise<void> {
  const existing = await SharedItem.exists({ userIdShared: recipientId, mealId });

  if (existing) {
    throw new AppError('This meal is already shared with that person', 409, 'ALREADY_SHARED');
  }
}

/**
 * Shares one of the sharer's own meals with the account registered to `email`.
 * Ownership is checked first, so nobody can share a meal they cannot see.
 */
export async function shareMeal(sharerId: string, input: ShareMealInput): Promise<void> {
  await getFoodEntry(sharerId, input.mealId);
  const recipientId = await findRecipientIdByEmail(input.email);

  if (recipientId === sharerId) {
    throw new AppError('You cannot share a meal with yourself', 400, 'CANNOT_SHARE_WITH_SELF');
  }

  await assertNotAlreadyShared(recipientId, input.mealId);
  await SharedItem.create({ userIdSharing: sharerId, userIdShared: recipientId, mealId: input.mealId });
}

export function toSharedUser(user: UserFields): SharedUser {
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  };
}

interface PopulatedShare {
  _id: { toString(): string };
  createdAt: Date;
  seenAt: Date | null;
  mealId: IFoodEntryDocument | null;
  userIdSharing: UserFields | null;
}

function toSharedMeal(item: PopulatedShare): SharedMeal | null {
  if (!item.mealId || !item.userIdSharing) return null;

  return {
    id: item._id.toString(),
    sharedAt: item.createdAt,
    sharedBy: toSharedUser(item.userIdSharing),
    seen: item.seenAt != null,
    meal: item.mealId,
  };
}

/** One page of the meals other users have shared with `recipientId`, newest share first. */
export async function listMealsSharedWith(
  recipientId: string,
  query: ListSharedMealsQuery
): Promise<PaginatedResult<SharedMeal>> {
  const filter = { userIdShared: recipientId };

  const [sharedItems, total] = await Promise.all([
    SharedItem.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(toSkipCount(query))
      .limit(query.limit)
      .populate<{ mealId: IFoodEntryDocument | null }>('mealId')
      .populate<{ userIdSharing: UserFields | null }>('userIdSharing', 'email firstName lastName'),
    SharedItem.countDocuments(filter),
  ]);

  // Deleting a meal removes its shares, but a share could still outlive its
  // meal or sharer if a delete fails part way; such a row has nothing to show.
  const sharedMeals = sharedItems.flatMap((item) => toSharedMeal(item) ?? []);

  return buildPaginatedResult(sharedMeals, total, query);
}

// `seenAt: null` also matches shares created before the field existed, so those count as new once.
const UNSEEN = { seenAt: null };

/** How many shares `recipientId` has not seen yet, for the sidebar badge. */
export async function countUnseenShares(recipientId: string): Promise<number> {
  return SharedItem.countDocuments({ userIdShared: recipientId, ...UNSEEN });
}

/**
 * Marks the listed shares as seen. Scoped to the recipient, so ids of other
 * people's shares are ignored rather than marked; already-seen ones keep their
 * original time.
 */
export async function markSharesSeen(recipientId: string, input: MarkSharesSeenInput): Promise<number> {
  const { modifiedCount } = await SharedItem.updateMany(
    { _id: { $in: input.shareIds }, userIdShared: recipientId, ...UNSEEN },
    { $set: { seenAt: new Date() } }
  );
  return modifiedCount;
}

/**
 * One meal shared with `recipientId`, by share id. A share sent to someone else
 * reads as missing rather than forbidden, so ids cannot be probed for existence.
 */
export async function getMealSharedWith(recipientId: string, shareId: string): Promise<SharedMeal> {
  const item = await SharedItem.findOne({ _id: shareId, userIdShared: recipientId })
    .populate<{ mealId: IFoodEntryDocument | null }>('mealId')
    .populate<{ userIdSharing: UserFields | null }>('userIdSharing', 'email firstName lastName');

  const sharedMeal = item && toSharedMeal(item);
  if (!sharedMeal) {
    throw new AppError('Shared meal not found', 404, 'SHARED_MEAL_NOT_FOUND');
  }

  return sharedMeal;
}
