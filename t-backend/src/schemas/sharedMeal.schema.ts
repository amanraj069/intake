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

export type ShareMealInput = z.infer<typeof shareMealSchema>['body'];
export type ListSharedMealsQuery = z.infer<typeof listSharedMealsSchema>['query'];
