export type JobModel = {
  job_id?: number | bigint;
  queue_id?: number;
  job_name: string;
  parameters?: string; // Or a more specific type if you use JSON
  status: number; // 0: pending, 1: running, 2: completed, 3: failed, 4: dead
  scheduled_time?: string;
  start_time?: string;
  completion_time?: string;
  created_at?: string;
  updated_at?: string;
  retries: number;
  max_retries?: number;
}