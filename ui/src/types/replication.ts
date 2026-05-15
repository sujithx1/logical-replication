export type ReplicationType =
  | "streaming"
  | "logical"
  | "physical"
  | "bidirectional";

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface ReplicaNode extends DbConfig {
  id?: string;
  subscription_name: string;
}