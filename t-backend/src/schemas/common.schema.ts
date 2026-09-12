import { z } from 'zod';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

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

/** Shared bound for any gram/millilitre amount, generous but not absurd. */
export const nonNegativeAmount = (label: string, max: number) =>
  z
    .number({ invalid_type_error: `${label} must be a number` })
    .nonnegative(`${label} cannot be negative`)
    .max(max, `${label} must be at most ${max}`);
