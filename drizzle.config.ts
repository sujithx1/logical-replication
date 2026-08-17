import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://sujith:Sujith@123@localhost:5432/mds",
  },
});
