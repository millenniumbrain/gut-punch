-- Drop existing tables if they exist
DROP TABLE IF EXISTS batch_jobs;
DROP TABLE IF EXISTS batches;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS queues;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_job_updated_at;
DROP TRIGGER IF EXISTS update_batch_updated_at;
DROP TRIGGER IF EXISTS mark_job_as_dead;

-- Create tables
CREATE TABLE IF NOT EXISTS queues (
    queue_id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    job_id INTEGER PRIMARY KEY,
    queue_id INTEGER,
    job_name TEXT NOT NULL,
    parameters TEXT,
    status INTEGER DEFAULT 0,  -- 0: pending, 1: running, 2: retrying, 3: completed, 4: failed, 5: dead
    scheduled_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    retries INTEGER DEFAULT 0,  -- Number of retries attempted
    max_retries INTEGER,      -- Maximum number of retries allowed (can be NULL)
    FOREIGN KEY (queue_id) REFERENCES queues(queue_id)
);

CREATE TABLE IF NOT EXISTS batches (
    batch_id INTEGER PRIMARY KEY,
    queue_id INTEGER NOT NULL,
    batch_name TEXT NOT NULL,
    status INTEGER DEFAULT 0,  -- Same status codes as jobs table
    scheduled_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (queue_id) REFERENCES queues(queue_id)
);

-- Index for efficient retrieval of pending/scheduled jobs
CREATE INDEX idx_jobs_status_scheduled_time ON jobs (status, scheduled_time);

-- Index for efficient retrieval of pending/scheduled batches
CREATE INDEX idx_batches_status_scheduled_time ON batches (status, scheduled_time);

-- Trigger to update the updated_at column in jobs table
CREATE TRIGGER update_job_updated_at
AFTER UPDATE ON jobs
FOR EACH ROW
BEGIN
    UPDATE jobs SET updated_at = CURRENT_TIMESTAMP WHERE job_id = NEW.job_id;
END;

-- Trigger to update the updated_at column in batches table
CREATE TRIGGER update_batch_updated_at
AFTER UPDATE ON batches
FOR EACH ROW
BEGIN
    UPDATE batches SET updated_at = CURRENT_TIMESTAMP WHERE batch_id = NEW.batch_id;
END;

-- Table to link jobs to batches (many-to-many relationship)
CREATE TABLE IF NOT EXISTS batch_jobs (
    batch_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id),
    PRIMARY KEY (batch_id, job_id) -- Composite key to prevent duplicate entries
);

-- Trigger to automatically mark a job as dead if it exceeds max retries
CREATE TRIGGER mark_job_as_dead
AFTER UPDATE ON jobs
FOR EACH ROW
WHEN NEW.status = 4 AND NEW.retries >= NEW.max_retries AND NEW.max_retries IS NOT NULL -- Check if status is 'failed' and retries exceed max_retries
BEGIN
    UPDATE jobs SET status = 5 WHERE job_id = NEW.job_id; -- Set status to 'dead' (5)
END;