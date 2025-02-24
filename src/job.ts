import type { job_model } from "./types/job_model";
import { job_status_codes } from "./enums/job_status_codes";

import { JobRepository } from "./repos/job_repository";
import type { DatabaseConnection } from "./database_connection";

export type JobHandler = ((parameters: any) => Promise<void>) | ((parameters: any) => void);
export type JobHandlerNoParamteters = (() => Promise<void>) | (() => void);

export class Job {
  private _job_repository: JobRepository;
  public jobHandlers: Map<string, JobHandler | JobHandlerNoParamteters>;


  constructor(databaseConnection: DatabaseConnection) {
    this._job_repository = new JobRepository(databaseConnection);
    this.jobHandlers = new Map();
  }

  clearHandler(jobName: string): boolean {
    return this.jobHandlers.delete(jobName);
  }

  clearAllHandlers(): void {
    this.jobHandlers.clear();
  }


  registerHandler(jobName: string, handler: JobHandler | JobHandlerNoParamteters): boolean {
    // Wrap non-async functions in a Promise
    const wrappedHandler = async (parameters: any) => {
      const result = handler(parameters);
      // If it's a Promise, await it, if not, it's already done
      if (result instanceof Promise) {
        await result;
      }

      this._job_repository.update(
        {
          status: job_status_codes.COMPLETED
        },
        {
          job_name: jobName,
          status: job_status_codes.RUNNING
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


  async createJob(name: string, handler: JobHandler | JobHandlerNoParamteters, parameters: any = {}) : Promise<job_model | null>  {
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
      } as job_model;
     savedJob = this._job_repository.create(job);
    }
    return savedJob;
  }
}