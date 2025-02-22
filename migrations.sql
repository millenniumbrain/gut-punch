CREATE TABLE queues (
    queue_id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
    job_id INTEGER PRIMARY KEY,
    queue_id INTEGER NOT NULL,
    job_name TEXT NOT NULL,
    parameters TEXT,
    status INTEGER DEFAULT 0,  -- 0: pending, 1: running, 2: completed, 3: failed, etc.
    scheduled_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (queue_id) REFERENCES queues(queue_id)
);

CREATE TABLE batches (
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
CREATE TABLE batch_jobs (
    batch_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id),
    PRIMARY KEY (batch_id, job_id) -- Composite key to prevent duplicate entries
);