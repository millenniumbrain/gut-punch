import Database from 'better-sqlite3';

export class DatabaseConnection {
  private _db: Database.Database;

  /**
   * Initializes the database connection and sets up the schema.
   * @param dbFilePath - The file path to the SQLite database.
   */
  constructor(dbFilePath: string, logging: boolean = true) {
    try {
      // Establish a connection to the SQLite database.
      if (logging) {
        this._db = new Database(dbFilePath, {
          verbose: console.log
        });
      } else {
        this._db = new Database(dbFilePath);
      }
      // Enable foreign key constraints if needed.
      this._db.pragma('foreign_keys = ON');
      this._db.pragma('journal_mode = WAL');
      // Initialize the database schema.
      
    } catch (error) {
      console.error('Failed to connect to the database:', error);
      throw error;
    }
  }

  get db(): Database.Database {
    return this._db;
  }

  /**
   * Inserts a record into the specified table.
   * @param table - The name of the table.
   * @param data - An object containing the data to insert.
   * @returns The ID of the inserted record.
   */
  insert(table: string, data: Record<string, any>): number | bigint {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(data);

    try {
      const stmt = this._db.prepare(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
      );
      const info = stmt.run(...values);
      return info.lastInsertRowid;
    } catch (error) {
      console.error(`Failed to insert into ${table}:`, error);
      throw error;
    }
  }

  /**
   * Updates records in the specified table based on conditions
   * @param table - The name of the table
   * @param data - The job model data to update
   * @param conditions - Object containing WHERE conditions
   * @returns Number of rows affected
   */
  async update(table: string, data: Record<string, any>, conditions: Record<string, any>): Promise<number> {
    const updateKeys = Object.keys(data).filter(key => data[key] !== undefined);
    const updateValues = updateKeys.map(key => data[key]);
    
    const whereKeys = Object.keys(conditions);
    const whereValues = Object.values(conditions);

    const updateStr = updateKeys.map(key => `${key} = ?`).join(', ');
    const whereStr = whereKeys.length 
        ? `WHERE ${whereKeys.map(key => `${key} = ?`).join(' AND ')}`
        : '';

    try {
      const stmt = this._db.prepare(
        `UPDATE ${table} SET ${updateStr} ${whereStr}`
      );
      const info = stmt.run(...updateValues, ...whereValues);
      return info.changes;
    } catch (error) {
      console.error(`Failed to update ${table}:`, error);
      throw error;
    }
  }

  close(): void {
    if (this._db) {
      this._db.close();
    }
  }
}