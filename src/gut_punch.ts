import { DatabaseConnection } from "./database_connection";
import { Job } from "./job";
import type { JobHandler } from "./job";
import type { JobModel } from "./types/job_model";
import Time from "./time";
import { parseDocument, type Document } from "yaml";
import { readFileSync } from "node:fs" 

export class GutPunch {
    private _databaseConnection: DatabaseConnection;
    private workers: any[];
    private max_workers: number;
    private queue: any[];
    private running_interval_ms: number;
    private interval_function: NodeJS.Timer | null
    private _job: Job;
    private _config: Document;

    constructor(databaseConnection: DatabaseConnection, max_workers: number = 1) {
        const configFile = readFileSync("./config.yaml", 'utf-8')
        this._config = parseDocument(configFile)
        this.max_workers = max_workers;
        this.workers = [];
        this.queue = [];
        this.running_interval_ms = 3000;
        this._databaseConnection = databaseConnection;
        this.interval_function = null;
        this._job = new Job(databaseConnection)
    }

    async performNow(name: string, handler: JobHandler, parameters: any = {}): Promise<JobModel | null> {
       return this._job.create(name, handler, parameters)
    }

    async performIn(time: Time, name: string, handler: JobHandler, parameters: any = {}, options: any) : Promise<JobModel| null> {
        parameters.scheduled_time = time.toString();
        return this._job.create(name, handler, parameters)
    }

    async performAt(time: Time, name: string, handler: JobHandler, parameters: any = {}, options: any) : Promise<JobModel | null> {
        parameters.scheduled_time = time.toString();
        return this._job.create(name, handler, parameters)
    }

    private async run(): Promise<void> {
        try {
            // sqlite doesn't support datetime comparison on utc strings with timezone
            // so we have to extract the first 19 characters to compare
            const stmt = this._databaseConnection.db.prepare(`
                SELECT * FROM jobs 
                WHERE datetime(substr(scheduled_time, 1, 19)) <= datetime('now')
                AND retries < 3
                AND status = 0 
                ORDER BY scheduled_time ASC
            `);
            
            const jobRows = stmt.all();
            const jobs = jobRows.map(row => row as JobModel);
            
            for (const job of jobs) {
                // Check for handler before starting job
                const handler = this._job.jobHandlers.get(job.job_name);
                if (!handler) {
                    // Update job status to failed with error message
                    this._databaseConnection.db.prepare(`
                        UPDATE jobs 
                        SET status = 4, 
                            retries = retries + 1,
                            parameters = json_set(COALESCE(parameters, '{}'), '$.error', ?)
                        WHERE job_id = ?
                    `).run(JSON.stringify(`No handler registered for job type: ${job.job_name}`), job.job_id);
                    
                    console.error(`No handler registered for job type: ${job.job_name}`);
                    continue;  // Skip to next job
                }

                try {
                    // Update job status to running
                    this._databaseConnection.db.prepare(`
                        UPDATE jobs SET status = 1 WHERE job_id = ?
                    `).run(job.job_id);

                    // Execute the job handler
                    const parameters = job.parameters ? JSON.parse(job.parameters) : {};
                    await handler(parameters);

                } catch (error: unknown) {
                    // Update job status to failed and increment retries
                    this._databaseConnection.db.prepare(`
                        UPDATE jobs 
                        SET status = 4, 
                            retries = retries + 1,
                            parameters = json_set(COALESCE(parameters, '{}'), '$.error', ?)
                        WHERE job_id = ?';
                    `).run(JSON.stringify(error), job.job_id);
                    
                    console.error(`Failed to process job ${job.job_id}:`, error);
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
        this._databaseConnection.close();
    }
}