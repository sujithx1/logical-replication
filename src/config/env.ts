import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string().default("default-jwt-secret-key-987654"),
    ENCRYPTION_KEY: z.string().default("default-secret-replication-key-123456"),
    PORT: z.coerce.number().default(3000),
  },
  clientPrefix: "PUBLIC_",
  client: {},
  runtimeEnv: process.env,
});
