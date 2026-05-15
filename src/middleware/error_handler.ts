import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { BaseError } from "../config/error";

export const errorHandler = (err: Error | HTTPException, c: Context) => {
  console.error("🔥 Global Error:", err);

  if (err instanceof BaseError) {
    return c.json(
      {
        message: err.message,
        type: err.name,
      },

      err.statusCode,
    );
  }

  if (err instanceof HTTPException) {
    return c.json(
      { message: err.message, error: "HTTP Exception" },
      err.status,
    );
  }

  //fiind the db error and throw

  // Unknown error
  return c.json({ message: "Internal Server Error", error: err.message }, 500);
};
