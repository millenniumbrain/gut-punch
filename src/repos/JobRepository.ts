import { DatabaseConnection } from '../database_connection';
import type { job } from '../types/job_model';
import { resolve } from 'node:path';

export class JobRepository {
    job: job | null;
    jobs: job[];
    private _database_repository: any;

    constructor() {
        this._database_repository = new DatabaseConnection(resolve(__dirname, '../../gut_punch.db'));
        this.jobs = [];
        this.job = null;
    }

    async create(job: job): Promise<number | bigint> {
        return this._database_repository.insert('jobs', job);
    }
}