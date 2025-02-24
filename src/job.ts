import type { JobModel } from "./types/job_model";
import { JobStatusCodes } from "./enums/job_status_codes";

import { JobRepository } from "./repos/job_repository";
import type { DatabaseConnection } from "./database_connection";

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
        },
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


  async createJob(name: string, handler: JobHandler, parameters: any = {}) : Promise<JobModel | null>  {
    const handlerRegistered = this.registerHandler(name, handler);
    let savedJob = null;
    const time = new Date();
    if (handlerRegistered) {
      const job = {
        job_name: name,
        parameters: JSON.stringify(parameters),
        scheduled_time: time.toISOString(),
        status: 0,
        max_retries: 3
      } as JobModel;
     savedJob = this._jobRepository.create(job);
    }
    return savedJob;
  }
}