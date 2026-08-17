CREATE TABLE "replica_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setup_id" uuid NOT NULL,
	"subscription_name" text NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"user" text NOT NULL,
	"password" text NOT NULL,
	"database" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replication_setups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"publication_name" text NOT NULL,
	"primary_host" text NOT NULL,
	"primary_port" integer NOT NULL,
	"primary_user" text NOT NULL,
	"primary_password" text NOT NULL,
	"primary_database" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"phone_number" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "replica_nodes" ADD CONSTRAINT "replica_nodes_setup_id_replication_setups_id_fk" FOREIGN KEY ("setup_id") REFERENCES "public"."replication_setups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replication_setups" ADD CONSTRAINT "replication_setups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;