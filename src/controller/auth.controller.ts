import type { Context } from "hono";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import z from "zod";
import { pdb } from "../db/db";
import { users } from "../schema/schema";
import { eq } from "drizzle-orm";
import { env } from "../config/env";

const JWT_SECRET = env.JWT_SECRET;

const registerSchema = z.object({
  username: z.string().min(3),
  phone_number: z.string().min(10),
  password: z.string().min(6),
  role: z.enum(["admin", "user"]).optional(),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const RegisterController = async (c: Context) => {
  const parsed = await registerSchema.safeParseAsync(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues.map((i) => i.message).join() }, 400);
  }

  const { username, phone_number, password, role = "user" } = parsed.data;

  try {
    // Check if user exists
    const existingUsers = await pdb.select().from(users).where(eq(users.username, username)).limit(1);
    if (existingUsers.length > 0) {
      return c.json({ error: "Username is already taken" }, 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pdb.insert(users).values({
      username,
      phoneNumber: phone_number,
      password: passwordHash,
      role,
    }).returning({
      id: users.id,
      username: users.username,
      phoneNumber: users.phoneNumber,
      role: users.role,
      createdAt: users.createdAt,
    });

    const user = result[0];
    return c.json({ success: true, user });
  } catch (err: any) {
    console.error(err);
    return c.json({ error: err.message || "Failed to register user" }, 500);
  }
};

export const LoginController = async (c: Context) => {
  const parsed = await loginSchema.safeParseAsync(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "Invalid username or password format" }, 400);
  }

  const { username, password } = parsed.data;

  try {
    const existingUsers = await pdb.select().from(users).where(eq(users.username, username)).limit(1);
    const user = existingUsers[0];

    console.log("user ", user);
    
    if (!user) {
      return c.json({ error: "Invalid username or password" }, 401);
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return c.json({ error: "Invalid username or password" }, 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        phone_number: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error(err);
    return c.json({ error: err.message || "Failed to log in" }, 500);
  }
};
