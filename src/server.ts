import { Hono } from "hono";
import { cors } from "hono/cors";
import { api } from "./api";
import { errorHandler } from "./middleware/error_handler";
import { initDb } from "./db/init";

const app = new Hono();
app.get("/", (c) => {
  return c.text("hello");
});

app.use("*", cors());

app.route("/api/replica", api);

app.onError((err, c) => errorHandler(err, c));

// Initialize Database Tables
initDb().catch((err) => {
  console.error("Failed to initialize database tables:", err);
});

console.log("listening on port 3000");
Bun.serve({
  port: 3000,
  fetch(req) {
    return app.fetch(req);
  },
});
