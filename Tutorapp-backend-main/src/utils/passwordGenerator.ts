import crypto from "crypto";

/**
 * Generate a secure temporary password
 */
export function generateTempPassword(length: number = 12): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%";
  const values = crypto.randomBytes(length);
  return Array.from(values, (byte) => charset[byte % charset.length]).join("");
}

/**
 * Generate a secure random token for email verification
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
