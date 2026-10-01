import { FoodDiaryImportJobData, ReportImportStage } from '../lib/foodDiaryImportJob';
import { FoodDiaryPreview, buildFoodDiaryPreview } from '../services/foodDiaryPreview.service';

/** The work one import job does, shared by the BullMQ worker and the in-memory fallback. */
export type ImportJobProcessor = (
  data: FoodDiaryImportJobData,
  reportStage: ReportImportStage
) => Promise<FoodDiaryPreview>;

export const processFoodDiaryImport: ImportJobProcessor = (data, reportStage) =>
  buildFoodDiaryPreview({ text: data.diaryText, pageCount: data.pageCount }, reportStage);
