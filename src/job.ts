import type { job } from "./types/job_model";

export class Job implements job {
  job_id?: number;
  queue_id?: number;
  job_name: string;
  parameters?: string;
  status!: number;
  scheduled_time?: string;
  created_at!: Date;
  updated_at!: Date;
  retries!: number;
  max_retries?: number;

  constructor(job: job) {
    this.job_id = job.job_id;
    this.queue_id = job.queue_id;
    this.job_name = job.job_name;
    this.parameters = job.parameters;
    this.status = job.status;
    this.scheduled_time = job.scheduled_time;
    this.created_at = new Date(job.created_at);
    this.updated_at = new Date(job.updated_at);
    this.retries = job.retries;
    this.max_retries = job.max_retries;
  }
}