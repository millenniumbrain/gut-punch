import { QueueRepository } from './repos/queue_repository';
import { Job } from './job'; // Import the Job class
import type { QueueModel } from './types/queue_model';
import type { DatabaseConnection } from './database_connection';

export class Queue {
  private readonly _queueRepository: QueueRepository;
  private readonly _job: Job; // Use the Job class

  constructor(dbConnection: DatabaseConnection) {
    this._queueRepository = new QueueRepository(dbConnection);
    this._job = new Job(dbConnection); // Initialize the Job class
  }

  async getQueues(conditions: Record<string, any>): Promise<QueueModel[]> {
    return this._queueRepository.getQueues(conditions);
  }

  async getSingle(id: number | bigint): Promise<QueueModel | null> {
    return this._queueRepository.getSingle(id);
  }

  async create(queue: Omit<QueueModel, 'queue_id' | 'created_at'>): Promise<QueueModel> {
    return this._queueRepository.create(queue);
  }

  async update(
    data: Partial<Omit<QueueModel, 'queue_id' | 'created_at'>>,
    conditions: Record<string, any>
  ): Promise<number> {
    return this._queueRepository.update(data, conditions);
  }

  async delete(id: number | bigint): Promise<number> {
    return this._queueRepository.delete(id);
  }

  async processQueueJobs(queueName: string): Promise<void> {
    try {
      const queues = await this._queueRepository.getQueues({ name: queueName });
      if (!queues || queues.length === 0) {
        console.warn(`Queue '${queueName}' not found.`);
        return;
      }

      const queue = queues[0];
      const jobs = await this._job.getJobs({ queue_id: queue.queue_id, status: 0 }); // Use Job class to get jobs

      for (const job of jobs) {
        const handler = this._job.jobHandlers.get(job.job_name);
        if (!handler) {
          console.error(`No handler registered for job type: ${job.job_name}`);
          await this._job.markJobFailed(job.job_id!, `No handler registered for job type: ${job.job_name}`); //Use Job class
          continue;
        }

        try {
          await this._job.markJobRunning(job.job_id!); //Use Job class
          const parameters = job.parameters ? JSON.parse(job.parameters) : {};
          await handler(parameters);
          await this._job.markJobCompleted(job.job_id!); //Use Job class
        } catch (error) {
          console.error(`Failed to process job ${job.job_id}:`, error);
          await this._job.markJobFailed(job.job_id!, error); //Use Job class
          await this._job.incrementJobRetries(job.job_id!); //Use Job class
        }
      }
    } catch (error) {
      console.error(`Error processing queue '${queueName}' jobs:`, error);
    }
  }
}