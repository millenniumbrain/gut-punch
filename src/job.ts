import type { job_model } from "./types/job_model";
import { JobRepository } from "./repos/JobRepository";

export type JobHandler = ((parameters: any) => Promise<void>) | ((parameters: any) => void);

export class Job {
  private _job_repository: JobRepository;
  private jobHandlers: Map<string, JobHandler>;


  constructor() {
    this._job_repository = new JobRepository();
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
    };
    try {
      this.jobHandlers.set(jobName, wrappedHandler);
    } catch (error: unknown) {
      return false;
    }
    return true;
  }


  async create_job(name: string, parameters: any = {}, handler: JobHandler) {
    const handler_registered = this.registerHandler(name, handler);
    if (handler_registered) {

    }
  }
}