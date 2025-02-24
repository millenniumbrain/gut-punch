import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { DatabaseConnection } from '../database_connection';
import { setup, teardown } from './setup';
import { GutPunch } from '../gut_punch';

describe('GutPunch Job Completion', () => {
    let gutPunch: GutPunch;
    let database_connection: DatabaseConnection;

    beforeEach(async () => {
        await setup();
        database_connection = new DatabaseConnection(path.resolve(__dirname, 'gut_punch.db'), false);
        gutPunch = new GutPunch(database_connection, 1);
        gutPunch.start();
    });

    afterEach(async () => {
        gutPunch.stop();
        database_connection.close();
        await teardown();
    });

    async function sleep(seconds: number) {
        return new Promise(resolve => setTimeout(resolve, seconds))
    }


    it('should complete a job successfully', async () => {
        // Create a new job
        const job = await gutPunch.performNow('test_job_easy', async function() {
            await sleep(1);
            console.log("Testing Running Job")
        }, { data: 'test' },);

        // Wait for job completion
        const checkJobStatus = async (): Promise<number> => {
            const result = database_connection.db.prepare('SELECT status FROM jobs WHERE job_id = ?').get(job?.job_id);
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
