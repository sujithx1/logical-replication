import type { ContentfulStatusCode } from "hono/utils/http-status";
import type z from "zod";

export const pritty_error = (error: z.ZodError) => {
  return error.issues.map((issue) => {
    const field = issue.path.join(".") || "root";
    return `${field}: ${issue.message}`;
  })[0];
};

export class BaseError extends Error {
  statusCode: ContentfulStatusCode;
  errorCode: string;

  constructor(
    message: string,
    statusCode: ContentfulStatusCode,
    errorCode: string,
  ) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode;

    // 🔥 THIS LINE FIXES EVERYTHING
    Object.setPrototypeOf(this, BaseError.prototype);

    Error.captureStackTrace(this, this.constructor);
  }
}
