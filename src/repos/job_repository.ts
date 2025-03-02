import { DatabaseConnection } from '../database_connection';
import type { JobModel } from '../types/job_model';
import { JobStatusCodes } from '../enums/job_status_codes';

export class JobRepository {
  private readonly _dbConnection: DatabaseConnection;

  constructor(dbConnection: DatabaseConnection) {
    this._dbConnection = dbConnection;
  }

  async getJobs(conditions: Record<string, any>): Promise<JobModel[]> {
    const whereClause = Object.keys(conditions)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    const values = Object.values(conditions);

    try {
      const stmt = this._dbConnection.db.prepare(`SELECT * FROM jobs ${whereClause ? `WHERE ${whereClause}` : ''}`);
      const rows = stmt.all(...values);
      return rows as JobModel[];
    } catch (error) {
      console.error('Error fetching jobs:', error);
      throw error; // Rethrow or handle as needed
    }
  }

  async getSingle(id: number | bigint): Promise<JobModel | null> {
    try {
      const stmt = this._dbConnection.db.prepare('SELECT * FROM jobs WHERE job_id = ?');
      const row = stmt.get(id);
      return row ? (row as JobModel) : null;
    } catch (error) {
      console.error(`Error fetching job with ID ${id}:`, error);
      throw error;
    }
  }

  async create(job: JobModel): Promise<JobModel> {
    const now = new Date();
    const jobWithTimestamps = { ...job, created_at: now.toISOString(), updated_at: now.toISOString() };

    try {
      const jobId = this._dbConnection.insert('jobs', jobWithTimestamps);
      return { ...jobWithTimestamps, job_id: jobId };
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

  async update(
    data: Partial<Omit<JobModel, 'job_id' | 'created_at' | 'updated_at'>>,
    conditions: Record<string, any>
  ): Promise<number> {
    const updateKeys = Object.keys(data);
    const updateValues = updateKeys.map((key) => (data as Record<string, any>)[key]);

    const whereKeys = Object.keys(conditions);
    const whereValues = Object.values(conditions);

    const updateStr = updateKeys.map((key) => `${key} = ?`).join(', ');
    const whereStr = whereKeys.length ? `WHERE ${whereKeys.map((key) => `${key} = ?`).join(' AND ')}` : '';

    try {
      const stmt = this._dbConnection.db.prepare(`UPDATE jobs SET ${updateStr}, updated_at = CURRENT_TIMESTAMP ${whereStr}`);
      const info = stmt.run(...updateValues, ...whereValues);
      return info.changes;
    } catch (error) {
      console.error('Error updating jobs:', error);
      throw error;
    }
  }

  async markJobPending(jobId: number | bigint): Promise<number> {
    return this.update({ status: JobStatusCodes.PENDING } as JobModel, { job_id: jobId });
  }


  async markJobCompleted(jobId: number | bigint): Promise<number> {
    return this.update({ status: JobStatusCodes.COMPLETED } as JobModel, { job_id: jobId });
  }

  async markJobFailed(jobId: number | bigint, error: any): Promise<number> {
      const errorString = JSON.stringify(error);
      return this.update({ status: JobStatusCodes.FAILED, parameters: JSON.stringify({error: errorString}) } as JobModel, {job_id: jobId})
  }

  async markJobRunning(jobId: number | bigint): Promise<number> {
    return this.update({ status: JobStatusCodes.RUNNING } as JobModel, { job_id: jobId });
  }

  async incrementJobRetries(jobId: number | bigint): Promise<number> {
    try {
      const stmt = this._dbConnection.db.prepare('UPDATE jobs SET retries = retries + 1, updated_at = CURRENT_TIMESTAMP WHERE job_id = ?');
      const info = stmt.run(jobId);
      return info.changes;
    } catch (error) {
      console.error('Error incrementing job retries:', error);
      throw error;
    }
  }

  async markJobDead(jobId: number | bigint): Promise<number> {
      return this.update({status: JobStatusCodes.DEAD} as JobModel, {job_id: jobId})
  }

}