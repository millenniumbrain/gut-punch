import { DatabaseConnection } from "./database_connection";
import { Job } from "./Job";
import type { JobHandler } from "./Job";

export class GutPunch {
    private _database_connection: DatabaseConnection;
    private workers: any[];
    private max_workers: number;
    private queue: any[];
    private running_interval_ms: number;
    private interval_function: NodeJS.Timer | null

    constructor(database_connection: DatabaseConnection, max_workers: number = 1) {
        this.max_workers = max_workers;
        this.workers = [];
        this.queue = [];
        this.running_interval_ms = 3000;
        this._database_connection = database_connection;
        this.jobHandlers = new Map();
        this.interval_function = null;
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
        } catch (error: Error) {
            return false;
        }
        return true;
    }

    clearHandler(jobName: string): boolean {
        return this.jobHandlers.delete(jobName);
    }

    clearAllHandlers(): void {
        this.jobHandlers.clear();
    }

    async perform_now(name: string, parameters: any = {}, handler: JobHandler): Promise<number | bigint> {
       

    }

    async perform_in(seconds: number, name: string, parameters: any = {}): Promise<number | bigint> {

    }

    async perform_at(time: Date, name: string, parameters: any = {}): Promise<number | bigint> {
        return this._database_connection.insert('jobs', {
            queue_id: 1, // default queue
            job_name: name,
            parameters: JSON.stringify(parameters),
            scheduled_time: time.toISOString(),
            status: 0,
            max_retries: 3
        });
    }

    private async run(): Promise<void> {
        try {
            // sqlite doesn't support datetime comparison on utc strings with timezone
            // so we have to extract the first 19 characters to compare
            const stmt = this._database_connection.db.prepare(`
                SELECT * FROM jobs 
                WHERE datetime(substr(scheduled_time, 1, 19)) <= datetime('now')
                AND status = 0 
                ORDER BY scheduled_time ASC
            `);
            
            const jobRows = stmt.all();
            const jobs = jobRows.map(row => new Job(row as any));
            
            for (const job of jobs) {
                // Check for handler before starting job
                const handler = this.jobHandlers.get(job.model.job_name);
                if (!handler) {
                    // Update job status to failed with error message
                    this._database_connection.db.prepare(`
                        UPDATE jobs 
                        SET status = 4, 
                            retries = retries + 1,
                            parameters = json_set(COALESCE(parameters, '{}'), '$.error', ?)
                        WHERE job_id = ?
                    `).run(JSON.stringify(`No handler registered for job type: ${job.model.job_name}`), job.model.job_id);
                    
                    console.error(`No handler registered for job type: ${job.model.job_name}`);
                    continue;  // Skip to next job
                }

                try {
                    // Update job status to running
                    this._database_connection.db.prepare(`
                        UPDATE jobs SET status = 1 WHERE job_id = ?
                    `).run(job.model.job_id);

                    // Execute the job handler
                    const parameters = job.model.parameters ? JSON.parse(job.model.parameters) : {};
                    await handler(parameters);

                    // Update job status to completed
                    this._database_connection.db.prepare(`
                        UPDATE jobs SET status = 3 WHERE job_id = ?
                    `).run(job.model.job_id);
                } catch (error: unknown) {
                    // Update job status to failed and increment retries
                    this._database_connection.db.prepare(`
                        UPDATE jobs 
                        SET status = 4, 
                            retries = retries + 1,
                            parameters = json_set(COALESCE(parameters, '{}'), '$.error', ?)
                        WHERE job_id = ?';
                    `).run(JSON.stringify(error), job.model.job_id);
                    
                    console.error(`Failed to process job ${job.model.job_id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error in run loop:', error);
        }
    }

    start(): void {
        this.interval_function = setInterval(() => this.run(), this.running_interval_ms);   
    }

    stop(): void {
        if (this.interval_function) {
            clearInterval(this.interval_function);
        }
        this._database_connection.close();
    }
}