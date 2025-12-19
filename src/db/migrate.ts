import 'dotenv/config';
import { query } from './index';

export async function migrate() {
  console.log('Running database migrations...');

  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      github_id VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(255) NOT NULL,
      access_token TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Repositories table
  await query(`
    CREATE TABLE IF NOT EXISTS repositories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      github_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      full_name VARCHAR(512) NOT NULL,
      owner VARCHAR(255) NOT NULL,
      is_selected BOOLEAN DEFAULT false,
      github_updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, github_id)
    )
  `);

  // Add github_updated_at column if it doesn't exist (for existing databases)
  await query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'repositories' AND column_name = 'github_updated_at'
      ) THEN
        ALTER TABLE repositories ADD COLUMN github_updated_at TIMESTAMP;
      END IF;
    END $$;
  `);

  // Activities table
  await query(`
    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      repo_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      github_id VARCHAR(255),
      author VARCHAR(255) NOT NULL,
      timestamp TIMESTAMP NOT NULL,
      raw_payload JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(repo_id, event_type, github_id)
    )
  `);

  // Create indexes
  await query(`
    CREATE INDEX IF NOT EXISTS idx_activities_repo_timestamp 
    ON activities(repo_id, timestamp DESC)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_activities_event_type 
    ON activities(event_type)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_repositories_user_selected 
    ON repositories(user_id, is_selected)
  `);

  // Summaries table
  await query(`
    CREATE TABLE IF NOT EXISTS summaries (
      id SERIAL PRIMARY KEY,
      repo_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
      week_start TIMESTAMP NOT NULL,  -- Start of summary period (can be 7, 14, or 30 days)
      week_end TIMESTAMP NOT NULL,    -- End of summary period
      summary_text TEXT NOT NULL,
      model_version VARCHAR(50) NOT NULL,
      deleted SMALLINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(repo_id, week_start, week_end)
    )
  `);

  // Add deleted column if it doesn't exist (for existing databases)
  await query(`
    ALTER TABLE summaries 
    ADD COLUMN IF NOT EXISTS deleted SMALLINT DEFAULT 0
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_summaries_repo_week 
    ON summaries(repo_id, week_start DESC)  -- Index for period-based queries
  `);

  console.log('Database migrations completed successfully!');
}

// Run migrations if this file is executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migrations finished');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
