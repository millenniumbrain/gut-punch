import { DatabaseConnection } from '../database_connection';
import type { JobModel } from '../types/job_model';
import { resolve } from 'node:path';

export class JobRepository {
    private _databaseConnection: any;

    constructor(databaseConnection: DatabaseConnection) {
        this._databaseConnection = databaseConnection;
    }

    getJobs(conditions: Record<string, any>) {

    }

    getSingle(id: number | bigint) {

    }

    async create(job: JobModel): Promise<JobModel> {
        const job_id = this._databaseConnection.insert('jobs', job);
        job.job_id = job_id;
        return job;
    }

/**
   * Updates records in the job table
   * @param table - The name of the table
   * @param data - The job model data to update
   * @param conditions - Object containing WHERE conditions
   * @returns Number of rows affected
   */
  async update(data: Record<string, any>, conditions: Record<string, any>): Promise<number> {
    return this._databaseConnection.update("jobs", data, conditions)
  }
}