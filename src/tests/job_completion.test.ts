import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { DatabaseRepository } from '../database';
import { setup, teardown } from './setup';
import { GutPunch } from '../gut_punch';

describe('GutPunch Job Completion', () => {
    let gutPunch: GutPunch;
    let db: DatabaseRepository;

    beforeEach(async () => {
        await setup();
        db = new DatabaseRepository(path.resolve(__dirname, 'gut_punch.db'), false);
        gutPunch = new GutPunch(db, 1);
    });

    afterEach(async () => {
        gutPunch.stop();
        db.close();
        await teardown();
    });


    it('should complete a job successfully', async () => {
        // Create a new job
        const jobId = await gutPunch.perform_now('test_job', { data: 'test' });

        // Wait for job completion
        const checkJobStatus = async (): Promise<number> => {
            const result = db.db.prepare('SELECT status FROM jobs WHERE job_id = ?').get(jobId);
            return (result as { status: number }).status;
        };

        // Poll job status until completed or timeout
        const timeout = 10000; // 10 seconds
        const startTime = Date.now();
        let status: number;

        while (true) {
            status = await checkJobStatus();
            
            // Check if job completed successfully
            if (status === 3) {
                break;
            }

            // Check if job failed or died
            if (status === 4 || status === 5) {
                throw new Error(`Job failed with status ${status}`);
            }

            // Check for timeout
            if (Date.now() - startTime > timeout) {
                throw new Error('Job execution timed out');
            }

            // Wait before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        expect(status).toBe(3); // 3 = completed
    }, 15000); // Set test timeout to 15 seconds
});
