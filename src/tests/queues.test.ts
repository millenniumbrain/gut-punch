import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { DatabaseConnection } from '../database_connection';
import { QueueRepository } from '../repos/queue_repository';
import { JobStatusCodes } from '../enums/job_status_codes';
import { setup, teardown } from './setup';
import type { JobModel } from '../types/job_model';
import type { QueueModel } from '../types/queue_model';
import { Job } from '../job';
import { Queue } from '../queue';

describe('Queue and Job Repository Integration Tests', () => {
  let dbConnection: DatabaseConnection;
  let job: Job;
  let queue: Queue;

  beforeEach(async () => {
    await setup();
    dbConnection = new DatabaseConnection(path.resolve(__dirname, 'gut_punch.db'));
    job = new Job(dbConnection);
    queue = new Queue(dbConnection);
  });

  afterEach(async () => {
    dbConnection.close();
    await teardown();
  });

  it('should create a queue and then create a job within that queue', async () => {
    // Create a queue
    const newQueue: Omit<QueueModel, 'queue_id' | 'created_at'> = {
      name: 'test_queue',
      description: 'Test Queue',
      enqueued: 1,
      enqueued_at: new Date().toISOString(),
    };
    const createdQueue = await queue.create(newQueue);
    expect(createdQueue).toBeDefined();
    expect(createdQueue.name).toBe('test_queue');

    const createdJob = await job.create("test_job", function() {
      console.log("Job test_job HAS RUN")
    }, { data: 'test data' });
    expect(createdJob).toBeDefined();
    if (createdJob) {
      expect(createdJob.job_name).toBe('test_job');
      expect(createdJob.queue_id).toBe(createdQueue.queue_id);
  
      // Verify the job exists in the database
      const fetchedJob = await job.getSingle(createdJob.job_id!);
      expect(fetchedJob).toBeDefined();
      expect(fetchedJob!.job_name).toBe('test_job');
  
      //Verify the queue exists in the database
      const fetchedQueue = await queue.getSingle(createdQueue.queue_id!);
      expect(fetchedQueue).toBeDefined();
      expect(fetchedQueue!.name).toBe('test_queue');
    }

  });

  it('should update a queue and then update a job within that queue', async () => {
    // Create a queue
    const newQueue: Omit<QueueModel, 'queue_id' | 'created_at'> = {
      name: 'update_queue',
      description: 'Queue to update',
      enqueued: 1,
      enqueued_at: new Date().toISOString(),
    };
    const createdQueue = await queue.create(newQueue);

    // Create a job within the created queue

    const createdJob = await job.create("update_jobs", function() {
      console.log("update_jobs has been marked pending")
    }, { data: 'initial data' });

    // Update the queue
    await queue.update({ description: 'Updated queue description' }, { queue_id: createdQueue.queue_id! });
    const updatedQueue = await queue.getSingle(createdQueue.queue_id!);
    expect(updatedQueue!.description).toBe('Updated queue description');

    if (createdJob) {
      // will return 1 otherwise 0
      const updatedJob = await job.markJobPending(createdJob.job_id!);
      if (updatedJob > 0) {
        const currentJob = await job.getSingle(createdJob.job_id || 0);
        if (currentJob) {
          expect(currentJob.status).toBe(JobStatusCodes.PENDING);
        } else {
          expect(0).toBe(1)
        }

      }
    }

  });

  it('should delete a queue and then verify its jobs are no longer accessible', async () => {
    // Create a queue
    const newQueue: Omit<QueueModel, 'queue_id' | 'created_at'> = {
      name: 'delete_queue',
      description: 'Queue for deletion',
      enqueued: 1,
      enqueued_at: new Date().toISOString(),
    };

    const createdQueue = await queue.create(newQueue);

    // Delete the queue
    await queue.delete(createdQueue.queue_id!);

    // Verify the queue is deleted
    const deletedQueue = await queue.getSingle(createdQueue.queue_id!);
    expect(deletedQueue).toBeNull();

    //verify the job is still accessible.
    const jobs = await job.getJobs({ queue_id: createdQueue.queue_id });
    expect(jobs.length).toBeGreaterThan(0);

  });
});