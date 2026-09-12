import { z } from 'zod';
import { calendarDaySchema } from './common.schema';

/** Shared date range fields. Both default to the last 7 days when omitted. */
const dateRangeFields = {
  startDate: calendarDaySchema.optional(),
  endDate: calendarDaySchema.optional(),
};

export const weeklyCaloriesSchema = z.object({
  query: z.object({ ...dateRangeFields }),
});

export const macrosSchema = z.object({
  query: z.object({
    ...dateRangeFields,
    groupBy: z.enum(['day', 'week']).default('day'),
  }),
});

export const microsSchema = z.object({
  query: z.object({ ...dateRangeFields }),
});

export const goalComparisonSchema = z.object({
  query: z.object({ ...dateRangeFields }),
});
