import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@magadhtech/mds-schema';
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const pdb = drizzle(pool, { schema, logger: false });

export { schema };
