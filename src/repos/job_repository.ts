import { DatabaseConnection } from '../database_connection';
import type { job_model } from '../types/job_model';
import { resolve } from 'node:path';

export class JobRepository {
    job: job_model | null;
    jobs: job_model[];
    private _databaseConnection: any;

    constructor(databaseConnection: DatabaseConnection) {
        this._databaseConnection = databaseConnection;
        this.jobs = [];
        this.job = null;
    }

    async create(job: job_model): Promise<job_model> {
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