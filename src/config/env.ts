import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    // No fallbacks on purpose: a known default would make every session forgeable and every stored
    // database password decryptable. Startup fails with a clear message when these are missing.
    JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
    ENCRYPTION_KEY: z.string().min(8, "ENCRYPTION_KEY must be at least 8 characters"),
    PORT: z.coerce.number().default(3000),
  },
  clientPrefix: "PUBLIC_",
  client: {},
  runtimeEnv: process.env,
});
