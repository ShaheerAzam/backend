import { Request, Response, NextFunction } from "express";
import { Schema } from "zod";
import { BadRequestError } from "../utils/errors";

export function validateRequest(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof Error) {
        next(new BadRequestError("Validation failed: " + error.message));
      } else {
        next(new BadRequestError("Validation failed: " + String(error)));
      }
    }
  };
}
