import Database from 'better-sqlite3';

export class DatabaseRepository {
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
   * @param data - An object representing the data to be inserted.
   * @returns The ID of the inserted record.
   */
  insert(table: string, data: Record<string, any>): number | bigint {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(data);

    const stmt = this._db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`);
    const info = stmt.run(...values);
    return info.lastInsertRowid;
  }

  close(): void {
    if (this._db) {
      this._db.close();
    }
  }
}