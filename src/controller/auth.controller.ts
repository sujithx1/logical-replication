import type { Context } from "hono";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import z from "zod";
import { pool } from "../db/db";

const JWT_SECRET = process.env.JWT_SECRET || "default-jwt-secret-key-987654";

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
    const userCheck = await pool.query("SELECT 1 FROM users WHERE username = $1", [username]);
    if (userCheck.rowCount && userCheck.rowCount > 0) {
      return c.json({ error: "Username is already taken" }, 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (username, phone_number, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, phone_number, role, created_at`,
      [username, phone_number, passwordHash, role]
    );

    const user = result.rows[0];
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
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = result.rows[0];

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
        phone_number: user.phone_number,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error(err);
    return c.json({ error: err.message || "Failed to log in" }, 500);
  }
};
