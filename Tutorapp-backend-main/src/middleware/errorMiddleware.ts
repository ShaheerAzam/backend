import { Request, Response, NextFunction } from "express";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { logger } from "../utils/logger";
import { ZodError } from "zod";

export default function errorMiddleware(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = 500;
  let message = "Internal Server Error";

  if (error instanceof ZodError) {
    statusCode = 400;
    message = `Validation failed: ${error.errors.map((e) => `${e.path}: ${e.message}`).join(", ")}`;
  } else if (error instanceof BadRequestError) {
    statusCode = 400;
    message = error.message;
  } else if (error instanceof UnauthorizedError) {
    statusCode = 401;
    message = error.message;
  } else {
    // Log unexpected errors for debugging
    logger.error(
      `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
  }

  // Log all errors
  logger.warn(`Error handled: ${message}`, {
    statusCode,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({ message });
}
