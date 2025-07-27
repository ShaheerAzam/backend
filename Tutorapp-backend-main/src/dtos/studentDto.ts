import { z } from "zod";
import {
  createStudentSchema,
  updateStudentProfileSchema,
  changeStudentPasswordSchema,
} from "../utils/validationSchemas";

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
export type UpdateStudentProfileDto = z.infer<
  typeof updateStudentProfileSchema
  >;
  export type ChangeStudentPasswordDto = z.infer<typeof changeStudentPasswordSchema>;
