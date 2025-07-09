import { z } from "zod";
import { createTutorSchema } from "../utils/validationSchemas";

export type CreateTutorDto = z.infer<typeof createTutorSchema>;
