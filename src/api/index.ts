import { Hono } from "hono";
import { CreateReplicationController } from "../controller/create-replication.controller";
import { GetReplicationStatusController } from "../controller/status-replication.controller";
import { UpdateSubscriptionController } from "../controller/update-replication.controller";
import { DeleteReplicationController } from "../controller/delete-replication.controller";

export const api = new Hono();

// CRUD Endpoints for Replication
api.post("/create", CreateReplicationController);
api.post("/status", GetReplicationStatusController);
api.post("/update-subscription", UpdateSubscriptionController);
api.post("/delete", DeleteReplicationController);