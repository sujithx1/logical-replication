export interface ConfigEnv {
  primary_db_env: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  replica_db_env: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };

  replica_db_url: string;
  prymary_db_url: string;
  publication_name: string;
  subscription_name: string;
  logical_tables: string[];
  DATABASE_URL: string;
}
export const config_env: ConfigEnv = {
  primary_db_env: {
    host: "localhost",
    port: 5432,
    user: "sujith",
    password: "Sujith@123",
    database: "mds",
  },
  replica_db_env: {
    host: "localhost",
    port: 5433,
    user: "sujith",
    password: "Sujith@123",
    database: "replica_mds",
  },

  replica_db_url: process.env.REPLICA_DB_URL!, //  "host=localhost port=5432 dbname=app user=postgres password=postgres";
  prymary_db_url: process.env.PRMARY_REPLICA_DB_URL!, //  "host=localhost port=5432 dbname=app user=postgres password=postgres";

  publication_name: "pg_logical_replication",
  subscription_name: "pg_logical_replication",
  logical_tables: [], // write with schema.table

  DATABASE_URL: process.env.DATABASE_URL!,
};
