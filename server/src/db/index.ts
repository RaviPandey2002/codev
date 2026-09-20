import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!, {
  onnotice: (notice) => {
    // Filter out benign collation version mismatch warnings (code '01000') and duplicate relation notices
    if (notice.code === '01000' || notice.code === '42P07' || notice.code === '42P06') {
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.info('[Postgres Notice]', notice.message);
    }
  },
});

export const db = drizzle(client, { schema });

