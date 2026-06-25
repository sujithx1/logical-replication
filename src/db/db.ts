import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@magadhtech/mds-schema';
import { env } from '../config/env';
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const pdb = drizzle(pool, { schema, logger: false });

export { schema };
