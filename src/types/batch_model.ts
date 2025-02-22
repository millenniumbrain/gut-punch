export type batch = {
  batch_id: number;
  queue_id: number;
  batch_name: string;
  status: number; // Same status codes as Job
  scheduled_time?: string;
  created_at: string;
  updated_at: string;
}