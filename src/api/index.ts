import { Hono } from "hono";
import { RegisterController, LoginController } from "../controller/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { CreateReplicationController } from "../controller/create-replication.controller";
import { GetReplicationStatusController } from "../controller/status-replication.controller";
import { UpdateSubscriptionController } from "../controller/update-replication.controller";
import { DeleteReplicationController } from "../controller/delete-replication.controller";
import { ListReplicationsController } from "../controller/list-replications.controller";

export const api = new Hono();

// Public Authentication Endpoints
api.post("/auth/register", RegisterController);
api.post("/auth/login", LoginController);

// Protected Replication CRUD Endpoints
api.use("/*", authMiddleware);
api.post("/create", CreateReplicationController);
api.post("/list", ListReplicationsController);
api.post("/status", GetReplicationStatusController);
api.post("/update-subscription", UpdateSubscriptionController);
api.post("/delete", DeleteReplicationController);