import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/errors";
import { logger } from "../utils/logger";

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; userType: string };
}

export function authMiddleware(
  requiredUserType?: "admin" | "student" | "tutor"
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Missing or invalid Authorization header");
      throw new UnauthorizedError("Authentication required");
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
        userId: string;
        userType: string;
      };
      if (requiredUserType && decoded.userType !== requiredUserType) {
        logger.warn(
          `Unauthorized access: ${decoded.userType} cannot access ${requiredUserType} route`
        );
        throw new UnauthorizedError("Unauthorized for this action");
      }

      req.user = { userId: decoded.userId, userType: decoded.userType };
      next();
    } catch (error) {
      // Type guard to ensure error is an instance of Error
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.warn(`Invalid JWT token: ${errorMessage}`);
      throw new UnauthorizedError("Invalid or expired token");
    }
  };
}
