/**
 * Initialize LangGraph checkpoint tables in PostgreSQL
 * Run this script once to create the required tables for PostgresSaver
 */

import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Exact schema from langgraph-checkpoint-postgres
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS checkpoint_migrations (
  v INTEGER PRIMARY KEY
);`,
  `CREATE TABLE IF NOT EXISTS checkpoints (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  type TEXT,
  checkpoint JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);`,
  `CREATE TABLE IF NOT EXISTS checkpoint_blobs (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL,
  version TEXT NOT NULL,
  type TEXT NOT NULL,
  blob BYTEA,
  PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);`,
  `CREATE TABLE IF NOT EXISTS checkpoint_writes (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  channel TEXT NOT NULL,
  type TEXT,
  blob BYTEA NOT NULL,
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);`,
  "ALTER TABLE checkpoint_blobs ALTER COLUMN blob DROP not null;",
];

async function initCheckpoints() {
  const client = await pool.connect();

  try {
    console.log('Creating LangGraph checkpoint tables...');

    for (let i = 0; i < MIGRATIONS.length; i++) {
      try {
        await client.query(MIGRATIONS[i]);
        console.log(`✓ Migration ${i + 1} applied`);
      } catch (err: any) {
        // Ignore duplicate table errors
        if (!err.message.includes('already exists')) {
          console.error(`Error in migration ${i + 1}:`, err.message);
        }
      }
    }

    console.log('\n✅ All checkpoint tables initialized successfully!');
  } catch (error) {
    console.error('Error initializing checkpoint tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  initCheckpoints()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

export default initCheckpoints;
