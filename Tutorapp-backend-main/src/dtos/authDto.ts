import { z } from "zod";
import {
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} from "../utils/validationSchemas";

export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type LogoutDto = z.infer<typeof logoutSchema>;
