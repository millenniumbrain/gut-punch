import type { JobModel } from "./types/job_model";
import { JobStatusCodes } from "./enums/job_status_codes";

import { JobRepository } from "./repos/job_repository";
import type { DatabaseConnection } from "./database_connection";
import Time from "./time";

export type JobHandler = ((parameters: any) => Promise<void>) | ((parameters: any) => void);

export class Job {
  private _jobRepository: JobRepository;

  public jobHandlers: Map<string, JobHandler>;


  constructor(databaseConnection: DatabaseConnection) {
    this._jobRepository = new JobRepository(databaseConnection);
    this.jobHandlers = new Map();
  }

  clearHandler(jobName: string): boolean {
    return this.jobHandlers.delete(jobName);
  }

  clearAllHandlers(): void {
    this.jobHandlers.clear();
  }


  registerHandler(jobName: string, handler: JobHandler): boolean {
    // Wrap non-async functions in a Promise
    const wrappedHandler = async (parameters: any) => {
      const result = handler(parameters);
      // If it's a Promise, await it, if not, it's already done
      if (result instanceof Promise) {
        await result;
      }

      // once the function runs mark the job as completed,
      // jobs should have unique names so we can easily match them to their handler
      this._jobRepository.update(
        {
          status: JobStatusCodes.COMPLETED
        } as JobModel,
        {
          job_name: jobName,
          status: JobStatusCodes.RUNNING
        }
      )
    };
    try {
      this.jobHandlers.set(jobName, wrappedHandler);
    } catch (error: unknown) {
      return false;
    }
    return true;
  }


  async create(name: string, handler: JobHandler, parameters: any = {}) : Promise<JobModel | null>  {
    const handlerRegistered = this.registerHandler(name, handler);
    let savedJob = null;
    const time = parameters.scheduled_time || (new Date()).toISOString();
    if (handlerRegistered) {
      const job = {
        job_name: name,
        parameters: JSON.stringify(parameters),
        scheduled_time: time,
        status: 0,
        max_retries: 3
      } as JobModel;
     savedJob = this._jobRepository.create(job);
    }
    return savedJob;
  }

  async createForQueue(name: string, handler: JobHandler, parameters: any = {}, queueId: number | bigint) : Promise<JobModel | null>  {
    const handlerRegistered = this.registerHandler(name, handler);
    let savedJob = null;
    const time = parameters.scheduled_time || (new Date()).toISOString();
    if (handlerRegistered) {
      const job = {
        queue_id: queueId,
        job_name: name,
        parameters: JSON.stringify(parameters),
        scheduled_time: time,
        status: 0,
        max_retries: 3
      } as JobModel;
     savedJob = this._jobRepository.create(job);
    }
    return savedJob;
  }

  async addToQueue(jobId: number | bigint, queueId: number | bigint): Promise<boolean> {
    const rowsUpdated = await this._jobRepository.update({ status: JobStatusCodes.PENDING, queue_id: queueId }, { job_id: jobId})
    return rowsUpdated === 1;
  }

  async getJobs(conditions: Record<string, any>): Promise<JobModel[]> {
    return this._jobRepository.getJobs(conditions);
  }

  async getSingle(id: number | bigint): Promise<JobModel | null> {
    return this._jobRepository.getSingle(id);
  }

  async getJobId(jobName: string, status: number): Promise<number | bigint> {
    const jobs = await this._jobRepository.getJobs({job_name: jobName, status: status});
    if (jobs && jobs.length > 0) {
      return jobs[0].job_id!;
    } else {
      throw new Error(`Job with name ${jobName} and status ${status} not found.`);
    }
  }

  getJobHandler(jobName: string): JobHandler | undefined {
    return this.jobHandlers.get(jobName);
  }
  
  async markJobPending(jobId: number | bigint): Promise<number> {
    return this._jobRepository.markJobPending(jobId);
  }

  async markJobCompleted(jobId: number | bigint): Promise<number> {
    return this._jobRepository.markJobCompleted(jobId);
  }

  async markJobFailed(jobId: number | bigint, error: any): Promise<number> {
    return this._jobRepository.markJobFailed(jobId, error);
  }

  async markJobRunning(jobId: number | bigint): Promise<number> {
    return this._jobRepository.markJobRunning(jobId);
  }

  async incrementJobRetries(jobId: number | bigint): Promise<number> {
    return this._jobRepository.incrementJobRetries(jobId);
  }

}