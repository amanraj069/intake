import { z } from 'zod';
import { MAX_IMPORT_ROWS } from '../lib/foodDiaryImportPrompt';

/**
 * Only the envelope is checked here. Each entry is validated on its own against
 * the single-entry create schema by the import service, so one bad row is
 * reported and skipped instead of rejecting the whole import.
 */
export const confirmFoodEntryImportSchema = z.object({
  body: z.object({
    entries: z
      .array(z.unknown(), { invalid_type_error: 'Entries must be a list' })
      .min(1, 'Add at least one entry to import')
      .max(MAX_IMPORT_ROWS, `At most ${MAX_IMPORT_ROWS} entries can be imported at once`),
  }),
});

export type ConfirmFoodEntryImportInput = z.infer<typeof confirmFoodEntryImportSchema>['body'];
