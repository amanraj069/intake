import { z } from 'zod';
import { objectIdSchema, paginationQueryFields } from './common.schema';

export const shareMealSchema = z.object({
  body: z.object({
    mealId: objectIdSchema,
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Enter a valid email address'),
  }),
});

export const listSharedMealsSchema = z.object({
  query: z.object(paginationQueryFields),
});

export const revokeMealAccessSchema = z.object({
  params: z.object({ mealId: objectIdSchema }),
  body: z.object({
    revokeUserIds: z
      .array(objectIdSchema, { required_error: 'Choose at least one person' })
      .min(1, 'Choose at least one person')
      .max(100, 'At most 100 people at a time'),
  }),
});

export const markSharesSeenSchema = z.object({
  body: z.object({
    shareIds: z
      .array(objectIdSchema, { required_error: 'shareIds is required' })
      .min(1, 'Give at least one share id')
      .max(100, 'At most 100 shares at a time'),
  }),
});

export const getSharedMealSchema = z.object({
  params: z.object({ shareId: objectIdSchema }),
});

export type ShareMealInput = z.infer<typeof shareMealSchema>['body'];
export type ListSharedMealsQuery = z.infer<typeof listSharedMealsSchema>['query'];
export type RevokeMealAccessInput = z.infer<typeof revokeMealAccessSchema>['body'];
export type MarkSharesSeenInput = z.infer<typeof markSharesSeenSchema>['body'];
