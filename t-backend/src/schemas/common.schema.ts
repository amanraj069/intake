import { z } from 'zod';
import { isRealCalendarDay } from '../lib/calendarDay';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
const CALENDAR_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Rejects malformed ids at the edge so Mongoose never throws a CastError. */
export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Must be a valid id');

/**
 * Accepts any string Date can parse (ISO 8601 from the frontend, but also plain
 * "YYYY-MM-DD" from a native date input). The service converts it to a Date.
 */
export const dateStringSchema = z
  .string()
  .min(1, 'Date is required')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Must be a valid date');

/**
 * A bare calendar day, used by filters and summaries where a time of day would
 * be meaningless. Stricter than `dateStringSchema`: no timestamps, and no
 * impossible dates such as `2026-02-31`.
 */
export const calendarDaySchema = z
  .string()
  .regex(CALENDAR_DAY_PATTERN, 'Must be a date in YYYY-MM-DD format')
  .refine(isRealCalendarDay, 'Must be a real calendar date');

/** Shared bound for any gram/millilitre amount, generous but not absurd. */
export const nonNegativeAmount = (label: string, max: number) =>
  z
    .number({ invalid_type_error: `${label} must be a number` })
    .nonnegative(`${label} cannot be negative`)
    .max(max, `${label} must be at most ${max}`);

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;

/**
 * The paging fields every list endpoint accepts. Spread into a query schema so
 * `page` and `limit` behave identically across the app. Values arrive as query
 * strings, hence the coercion.
 */
export const paginationQueryFields = {
  page: z.coerce
    .number({ invalid_type_error: 'Page must be a number' })
    .int('Page must be a whole number')
    .min(1, 'Page must be at least 1')
    .default(PAGINATION_DEFAULTS.page),
  limit: z.coerce
    .number({ invalid_type_error: 'Limit must be a number' })
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(PAGINATION_DEFAULTS.maxLimit, `Limit must be at most ${PAGINATION_DEFAULTS.maxLimit}`)
    .default(PAGINATION_DEFAULTS.limit),
};
