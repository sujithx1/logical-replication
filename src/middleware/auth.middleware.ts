import type { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

const JWT_SECRET = env.JWT_SECRET;

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: "admin" | "user";
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing token" }, 401);
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return c.json({ error: "Unauthorized: Invalid token format" }, 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    c.set("user", decoded);
    await next();
  } catch (err) {
    return c.json({ error: "Unauthorized: Invalid or expired token" }, 401);
  }
};
