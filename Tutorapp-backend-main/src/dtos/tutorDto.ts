import { z } from "zod";
import { createTutorSchema } from "../utils/validationSchemas";

export type CreateTutorDto = z.infer<typeof createTutorSchema>;
export type ChangeTutorPasswordDto = z.infer<typeof changeTutorPasswordSchema>;
