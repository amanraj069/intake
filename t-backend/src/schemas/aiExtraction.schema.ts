import { z } from 'zod';

export const MAX_IMAGE_DESCRIPTION_LENGTH = 200;

/**
 * Multipart text fields that travel with the photo. Multer has already parsed
 * them into `req.body` by the time this runs; the file itself is checked by the
 * upload middleware and the service.
 */
export const extractNutritionSchema = z.object({
  body: z.object({
    description: z
      .string()
      .trim()
      .max(
        MAX_IMAGE_DESCRIPTION_LENGTH,
        `Description must be ${MAX_IMAGE_DESCRIPTION_LENGTH} characters or fewer`
      )
      .optional()
      .transform((value) => value || undefined),
  }),
});

export type ExtractNutritionInput = z.infer<typeof extractNutritionSchema>['body'];
