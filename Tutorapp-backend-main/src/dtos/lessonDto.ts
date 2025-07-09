import { z } from "zod";
import {
  createLessonSchema,
  createLessonBundleSchema,
  rescheduleLessonSchema,
  updateTutorProfileSchema,
  cancelLessonSchema,
} from "../utils/validationSchemas";

export type CreateLessonDto = z.infer<typeof createLessonSchema>;
export type CreateLessonBundleDto = z.infer<typeof createLessonBundleSchema>;
export type RescheduleLessonDto = z.infer<typeof rescheduleLessonSchema>;
export type UpdateTutorProfileDto = z.infer<typeof updateTutorProfileSchema>;
export type CancelLessonDto = z.infer<typeof cancelLessonSchema>;
