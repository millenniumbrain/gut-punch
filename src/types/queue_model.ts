export type QueueModel = {
  queue_id?: number | bigint;
  name: string;
  enqueued: number;
  enqueued_at: string;
  description?: string;
  created_at: string;
}