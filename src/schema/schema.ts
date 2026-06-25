import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  password: text("password").notNull(),
  role: text("role").$type<"admin" | "user">().default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const replicationSetups = pgTable("replication_setups", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  publicationName: text("publication_name").notNull(),
  primaryHost: text("primary_host").notNull(),
  primaryPort: integer("primary_port").notNull(),
  primaryUser: text("primary_user").notNull(),
  primaryPassword: text("primary_password").notNull(),
  primaryDatabase: text("primary_database").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const replicaNodes = pgTable("replica_nodes", {
  id: uuid("id").defaultRandom().primaryKey(),
  setupId: uuid("setup_id").references(() => replicationSetups.id, { onDelete: "cascade" }).notNull(),
  subscriptionName: text("subscription_name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  user: text("user").notNull(),
  password: text("password").notNull(),
  database: text("database").notNull(),
});
