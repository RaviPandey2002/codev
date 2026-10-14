import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!, {
  // Cap pool size to prevent exceeding database connection limits
  max: Number(process.env.DB_MAX_CONNECTIONS) || 10,
  // Close idle connections after 20s so serverless hosts (like Neon) can auto-suspend and save compute hours
  idle_timeout: 20,
  // Allow up to 10s for cold starts before timing out
  connect_timeout: 10,
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

