import Database from 'better-sqlite3';

class DatabaseRepository {
  private db: Database.Database;

  /**
   * Initializes the database connection and sets up the schema.
   * @param dbFilePath - The file path to the SQLite database.
   */
  constructor(dbFilePath: string, logging: boolean = true) {
    try {
      // Establish a connection to the SQLite database.
      if (logging) {
        this.db = new Database(dbFilePath, {
          verbose: console.log
        });
      } else {
        this.db = new Database(dbFilePath);
      }
      // Enable foreign key constraints if needed.
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('journal_mode = WAL');
      // Initialize the database schema.
      
    } catch (error) {
      console.error('Failed to connect to the database:', error);
      throw error;
    }
  }
}