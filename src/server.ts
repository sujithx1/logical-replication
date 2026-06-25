import { env } from "./config/env";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { api } from "./api";
import { errorHandler } from "./middleware/error_handler";

const app = new Hono();
app.get("/", (c) => {
  return c.text("hello");
});

app.use("*", cors());

app.route("/api/replica", api);

app.onError((err, c) => errorHandler(err, c));

// Initialize Database Tables
// initDb().catch((err) => {
//   console.error("Failed to initialize database tables:", err);
// });


console.log(`listening on port ${env.PORT}`);
Bun.serve({
  port: env.PORT,
  fetch(req) {
    return app.fetch(req);
  },
});
