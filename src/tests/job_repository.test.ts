import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { DatabaseConnection } from '../database_connection';
import { JobRepository } from '../repos/job_repository';
import { JobStatusCodes } from '../enums/job_status_codes';
import { setup, teardown } from './setup';
import type { JobModel } from '../types/job_model';

describe('Job Repository Tests', () => {
  let dbConnection: DatabaseConnection;
  let jobRepository: JobRepository;

  beforeEach(async () => {
    await setup();
    dbConnection = new DatabaseConnection(path.resolve(__dirname, 'gut_punch.db'));
    jobRepository = new JobRepository(dbConnection);
  });

  afterEach(async () => {
    dbConnection.close();
    await teardown();
  });

  it('should create a job', async () => {
    const newJob: Omit<JobModel, 'job_id' | 'created_at' | 'updated_at'> = {
      queue_id: 1,
      job_name: 'test_job',
      parameters: JSON.stringify({ data: 'test data' }),
      status: JobStatusCodes.PENDING,
      scheduled_time: new Date().toISOString(),
      max_retries: 3,
      retries: 0,
    };
    const createdJob = await jobRepository.create({
      ...newJob
    });
    expect(createdJob).toBeDefined();
    expect(createdJob.job_name).toBe('test_job');

    const fetchedJob = await jobRepository.getSingle(createdJob.job_id!);
    expect(fetchedJob).toBeDefined();
    expect(fetchedJob!.job_name).toBe('test_job');
  });

  it('should update a job', async () => {
    const newJob: Omit<JobModel, 'job_id' | 'created_at' | 'updated_at'> = {
      queue_id: 1,
      job_name: 'update_job',
      parameters: JSON.stringify({ data: 'initial data' }),
      status: JobStatusCodes.PENDING,
      scheduled_time: new Date().toISOString(),
      max_retries: 3,
      retries: 0,
    };
    const createdJob = await jobRepository.create(newJob);

    await jobRepository.update({ parameters: JSON.stringify({ data: 'updated data' }) }, { job_id: createdJob.job_id! });
    const updatedJob = await jobRepository.getSingle(createdJob.job_id!);
    expect(JSON.parse(updatedJob!.parameters!).data).toBe('updated data');
  });

  it('should get jobs by conditions', async () => {
    const newJob: Omit<JobModel, 'job_id' | 'created_at' | 'updated_at'> = {
      queue_id: 1,
      job_name: 'get_jobs_job',
      parameters: JSON.stringify({ data: 'data' }),
      status: JobStatusCodes.PENDING,
      scheduled_time: new Date().toISOString(),
      max_retries: 3,
      retries: 0,
    };
    await jobRepository.create(newJob);

    const jobs = await jobRepository.getJobs({ status: JobStatusCodes.PENDING });
    expect(jobs).toBeDefined();
    expect(jobs.length).toBeGreaterThan(0);
  });

  it('should mark job completed', async () => {
    const newJob: Omit<JobModel, 'job_id' | 'created_at' | 'updated_at'> = {
      queue_id: 1,
      job_name: 'complete_job',
      parameters: JSON.stringify({ data: 'data' }),
      status: JobStatusCodes.PENDING,
      scheduled_time: new Date().toISOString(),
      max_retries: 3,
      retries: 0,
    };
    const createdJob = await jobRepository.create(newJob);

    await jobRepository.markJobCompleted(createdJob.job_id!);
    const completedJob = await jobRepository.getSingle(createdJob.job_id!);
    expect(completedJob!.status).toBe(JobStatusCodes.COMPLETED);
  });
});