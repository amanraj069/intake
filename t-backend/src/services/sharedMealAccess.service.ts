import { Types } from 'mongoose';
import { FoodEntry, IFoodEntryDocument } from '../models/FoodEntry';
import { SharedItem } from '../models/SharedItem';
import { User } from '../models/User';
import { PaginatedResult, buildPaginatedResult, toSkipCount } from '../lib/pagination';
import { ListSharedMealsQuery, RevokeMealAccessInput } from '../schemas/sharedMeal.schema';
import { getFoodEntry } from './foodEntry.service';
import { SharedUser, UserFields, toSharedUser } from './sharedMeal.service';

/** One of the current user's meals and everyone it is currently shared with. */
export interface SentMeal {
  id: string;
  lastSharedAt: Date;
  sharedWith: SharedUser[];
  meal: IFoodEntryDocument;
}

export interface MealAccess {
  revokedCount: number;
  sharedWith: SharedUser[];
}

interface MealShareGroup {
  _id: Types.ObjectId;
  recipientIds: Types.ObjectId[];
  lastSharedAt: Date;
}

interface MealShareFacet {
  groups: MealShareGroup[];
  total: { count: number }[];
}

const SHARED_USER_FIELDS = 'email firstName lastName';

/** One page of the sharer's meals that have at least one recipient, grouped per meal. */
async function findMealShareGroups(
  sharerId: string,
  query: ListSharedMealsQuery
): Promise<{ groups: MealShareGroup[]; total: number }> {
  const [facet] = await SharedItem.aggregate<MealShareFacet>([
    { $match: { userIdSharing: new Types.ObjectId(sharerId) } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: '$mealId', recipientIds: { $push: '$userIdShared' }, lastSharedAt: { $max: '$createdAt' } } },
    { $sort: { lastSharedAt: -1, _id: -1 } },
    {
      $facet: {
        groups: [{ $skip: toSkipCount(query) }, { $limit: query.limit }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  return { groups: facet?.groups ?? [], total: facet?.total[0]?.count ?? 0 };
}

async function findUsersById(userIds: Types.ObjectId[]): Promise<Map<string, SharedUser>> {
  const users = await User.find({ _id: { $in: userIds } }).select(SHARED_USER_FIELDS).lean<UserFields[]>();
  return new Map(users.map((user) => [user._id.toString(), toSharedUser(user)]));
}

function resolveUsers(userIds: Types.ObjectId[], usersById: Map<string, SharedUser>): SharedUser[] {
  return userIds.flatMap((userId) => usersById.get(userId.toString()) ?? []);
}

/** One page of the meals `sharerId` has shared, one row per meal, most recently shared first. */
export async function listMealsSharedBy(
  sharerId: string,
  query: ListSharedMealsQuery
): Promise<PaginatedResult<SentMeal>> {
  const { groups, total } = await findMealShareGroups(sharerId, query);

  const [meals, usersById] = await Promise.all([
    FoodEntry.find({ _id: { $in: groups.map((group) => group._id) } }),
    findUsersById(groups.flatMap((group) => group.recipientIds)),
  ]);
  const mealsById = new Map(meals.map((meal) => [meal._id.toString(), meal]));

  // A share can outlive its meal or recipient if a delete fails part way; such rows have nothing to show.
  const sentMeals = groups.flatMap((group) => {
    const meal = mealsById.get(group._id.toString());
    const sharedWith = resolveUsers(group.recipientIds, usersById);
    if (!meal || sharedWith.length === 0) return [];
    return [{ id: group._id.toString(), lastSharedAt: group.lastSharedAt, sharedWith, meal }];
  });

  return buildPaginatedResult(sentMeals, total, query);
}

async function findRecipientsOf(mealId: string): Promise<SharedUser[]> {
  const shares = await SharedItem.find({ mealId }).sort({ createdAt: 1 }).select('userIdShared').lean();
  const recipientIds = shares.map((share) => share.userIdShared);
  return resolveUsers(recipientIds, await findUsersById(recipientIds));
}

/**
 * Takes the meal away from each listed recipient. Ownership is checked first, so
 * only the person who logged the meal can change who sees it. Ids that never had
 * access are ignored rather than rejected: the end state is what was asked for.
 */
export async function revokeMealAccess(
  ownerId: string,
  mealId: string,
  input: RevokeMealAccessInput
): Promise<MealAccess> {
  await getFoodEntry(ownerId, mealId);

  const { deletedCount } = await SharedItem.deleteMany({
    mealId,
    userIdSharing: ownerId,
    userIdShared: { $in: input.revokeUserIds },
  });

  return { revokedCount: deletedCount, sharedWith: await findRecipientsOf(mealId) };
}
