import { DatabaseConnection } from '../database_connection';
import type { QueueModel } from '../types/queue_model';

export class QueueRepository {
  private readonly _dbConnection: DatabaseConnection;

  constructor(dbConnection: DatabaseConnection) {
    this._dbConnection = dbConnection;
  }

  async getQueues(conditions: Record<string, any>): Promise<QueueModel[]> {
    const whereClause = Object.keys(conditions)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    const values = Object.values(conditions);

    try {
      const stmt = this._dbConnection.db.prepare(`SELECT * FROM queues ${whereClause ? `WHERE ${whereClause}` : ''} ORDER BY priority ASC`);
      const rows = stmt.all(...values);
      return rows as QueueModel[];
    } catch (error) {
      console.error('Error fetching queues:', error);
      throw error;
    }
  }

  async getSingle(id: number | bigint): Promise<QueueModel | null> {
    try {
      const stmt = this._dbConnection.db.prepare('SELECT * FROM queues WHERE queue_id = ?');
      const row = stmt.get(id);
      return row ? (row as QueueModel) : null;
    } catch (error) {
      console.error(`Error fetching queue with ID ${id}:`, error);
      throw error;
    }
  }

  async create(queue: Omit<QueueModel, 'queue_id' | 'created_at'>): Promise<QueueModel> {
    const now = new Date();
    const queueWithTimestamps = { ...queue, created_at: now.toISOString() };

    try {
      const queueId = this._dbConnection.insert('queues', queueWithTimestamps);
      return { ...queueWithTimestamps, queue_id: queueId };
    } catch (error) {
      console.error('Error creating queue:', error);
      throw error;
    }
  }

  async update(
    data: Partial<Omit<QueueModel, 'queue_id' | 'created_at'>>,
    conditions: Record<string, any>
  ): Promise<number> {
    const updateKeys = Object.keys(data);
    const updateValues = updateKeys.map((key) => (data as Record<string, any>)[key]);

    const whereKeys = Object.keys(conditions);
    const whereValues = Object.values(conditions);

    const updateStr = updateKeys.map((key) => `${key} = ?`).join(', ');
    const whereStr = whereKeys.length ? `WHERE ${whereKeys.map((key) => `${key} = ?`).join(' AND ')}` : '';

    try {
      const stmt = this._dbConnection.db.prepare(`UPDATE queues SET ${updateStr} ${whereStr}`);
      const info = stmt.run(...updateValues, ...whereValues);
      return info.changes;
    } catch (error) {
      console.error('Error updating queues:', error);
      throw error;
    }
  }

  async delete(id: number | bigint): Promise<number> {
    try {
      const stmt = this._dbConnection.db.prepare('DELETE FROM queues WHERE queue_id = ?');
      const info = stmt.run(id);
      return info.changes;
    } catch (error) {
      console.error(`Error deleting queue with ID ${id}:`, error);
      throw error;
    }
  }
}