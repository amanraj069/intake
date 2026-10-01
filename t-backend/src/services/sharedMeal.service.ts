import { IFoodEntryDocument } from '../models/FoodEntry';
import { SharedItem } from '../models/SharedItem';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { PaginatedResult, buildPaginatedResult, toSkipCount } from '../lib/pagination';
import { ListSharedMealsQuery, ShareMealInput } from '../schemas/sharedMeal.schema';
import { getFoodEntry } from './foodEntry.service';

/** Who shared a meal, trimmed to what the recipient needs to recognise them. */
export interface SharedBy {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface SharedMeal {
  id: string;
  sharedAt: Date;
  sharedBy: SharedBy;
  meal: IFoodEntryDocument;
}

interface SharerFields {
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

function toSharedBy(sharer: SharerFields): SharedBy {
  return {
    id: sharer._id.toString(),
    email: sharer.email,
    firstName: sharer.firstName ?? null,
    lastName: sharer.lastName ?? null,
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
      .populate<{ userIdSharing: SharerFields | null }>('userIdSharing', 'email firstName lastName'),
    SharedItem.countDocuments(filter),
  ]);

  // Deleting a meal removes its shares, but a share could still outlive its
  // meal or sharer if a delete fails part way; such a row has nothing to show.
  const sharedMeals = sharedItems.flatMap((item) =>
    item.mealId && item.userIdSharing
      ? [{ id: item._id.toString(), sharedAt: item.createdAt, sharedBy: toSharedBy(item.userIdSharing), meal: item.mealId }]
      : []
  );

  return buildPaginatedResult(sharedMeals, total, query);
}
