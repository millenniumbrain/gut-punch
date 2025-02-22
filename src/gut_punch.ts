import { DatabaseRepository } from "./database";
import { Job } from "./job";

export class GutPunch {
    private database_repository: DatabaseRepository;
    private workers: any[];
    private max_workers: number;
    private queue: any[];
    private running_interval_ms: number;
    private interval_function: NodeJS.Timer;

    constructor(db: DatabaseRepository, max_workers: number = 1) {
        this.max_workers = max_workers;
        this.workers = [];
        this.queue = [];
        this.running_interval_ms = 3000;
        this.database_repository = db;
        this.interval_function = setInterval(() => this.run(), this.running_interval_ms);
    }

    async perform_now(name: string, parameters: any = {}): Promise<number | bigint> {
        return this.database_repository.insert('jobs', {
            queue_id: null, // default queue
            job_name: name,
            parameters: JSON.stringify(parameters),
            scheduled_time: new Date().toISOString(),
            status: 0,
            max_retries: 3
        });
    }

    async perform_in(seconds: number, name: string, parameters: any = {}): Promise<number | bigint> {
        const scheduled_time = new Date(Date.now() + (seconds * 1000));
        return this.database_repository.insert('jobs', {
            queue_id: null, // default queue
            job_name: name,
            parameters: JSON.stringify(parameters),
            scheduled_time: scheduled_time.toISOString(),
            status: 0,
            max_retries: 3
        });
    }

    async perform_at(time: Date, name: string, parameters: any = {}): Promise<number | bigint> {
        return this.database_repository.insert('jobs', {
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
            // sqlite doesn't support datetime comparison on utc strings
            // so we have to extract the first 19 characters to compare
            const stmt = this.database_repository.db.prepare(`
                SELECT * FROM jobs 
                WHERE datetime(substr(scheduled_time, 1, 19)) <= datetime('now')
                AND status = 0 
                ORDER BY scheduled_time ASC
            `);
            
            const jobRows = stmt.all();
            const jobs = jobRows.map(row => new Job(row as any));
            
            for (const job of jobs) {
                try {
                    // Update job status to running
                    this.database_repository.db.prepare(`
                        UPDATE jobs SET status = 1 WHERE job_id = ?
                    `).run(job.job_id);

                    // Here you would actually execute the job
                    console.log(`Executing job ${job.job_id}: ${job.job_name}`);
                    await Promise.resolve(); // placeholder for actual job execution

                    // Update job status to completed
                    this.database_repository.db.prepare(`
                        UPDATE jobs SET status = 3 WHERE job_id = ?
                    `).run(job.job_id);
                } catch (error) {
                    // Update job status to failed and increment retries
                    this.database_repository.db.prepare(`
                        UPDATE jobs 
                        SET status = 4, retries = retries + 1 
                        WHERE job_id = ?
                    `).run(job.job_id);
                    
                    console.error(`Failed to process job ${job.job_id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error in run loop:', error);
        }
    }

    stop(): void {
        clearInterval(this.interval_function);
        this.database_repository.close();
    }
}