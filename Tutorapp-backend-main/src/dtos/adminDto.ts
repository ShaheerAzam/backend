import { z } from "zod";
import { changeAdminPasswordSchema } from "../utils/validationSchemas";

export type ChangeAdminPasswordDto = z.infer<typeof changeAdminPasswordSchema>;
