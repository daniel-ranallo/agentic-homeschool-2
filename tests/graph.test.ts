/**
 * Integration tests for the LangGraph checkpointer setup
 * These tests verify that the checkpoint tables exist and are properly configured
 *
 * This test would have caught the "relation checkpoints does not exist" error
 * that occurred when trying to use the graph endpoint without initializing tables.
 *
 * To run these tests: npm test
 * To initialize tables: npm run db:init-checkpoints
 */

import { Pool } from 'pg';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

const testDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/course_design';

describe('LangGraph Checkpointer Setup', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: testDbUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Table existence', () => {
    it('should have checkpoint_migrations table', async () => {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'checkpoint_migrations'
          );
        `);
        expect(result.rows[0].exists).toBe(true);
      } finally {
        client.release();
      }
    });

    it('should have checkpoints table with correct schema', async () => {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'checkpoints'
          );
        `);
        expect(result.rows[0].exists).toBe(true);

        // Verify columns exist
        const columns = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'checkpoints';
        `);
        const columnNames = columns.rows.map((r: any) => r.column_name);
        expect(columnNames).toContain('thread_id');
        expect(columnNames).toContain('checkpoint_id');
        expect(columnNames).toContain('checkpoint');
        expect(columnNames).toContain('metadata');
      } finally {
        client.release();
      }
    });

    it('should have checkpoint_blobs table', async () => {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'checkpoint_blobs'
          );
        `);
        expect(result.rows[0].exists).toBe(true);
      } finally {
        client.release();
      }
    });

    it('should have checkpoint_writes table', async () => {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'checkpoint_writes'
          );
        `);
        expect(result.rows[0].exists).toBe(true);
      } finally {
        client.release();
      }
    });
  });

  describe('PostgresSaver initialization', () => {
    it('should be able to create and setup PostgresSaver without throwing', async () => {
      const checkpointer = new PostgresSaver(pool);
      await expect(checkpointer.setup()).resolves.not.toThrow();
    });
  });
});
