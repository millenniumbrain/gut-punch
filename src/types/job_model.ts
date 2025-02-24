export type job_model = {
  job_id?: number;
  queue_id?: number;
  job_name: string;
  parameters?: string; // Or a more specific type if you use JSON
  status: number; // 0: pending, 1: running, 2: completed, 3: failed, 4: dead
  scheduled_time?: string;
  start_time?: Date;
  completion_time?: Date;
  created_at: Date;
  updated_at: Date;
  retries: number;
  max_retries?: number;
}