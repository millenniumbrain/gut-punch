import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export async function setup() {
  console.log("Setup");

  const dbPath = path.resolve(__dirname, 'gut_punch.db');
  const migrationsPath = path.resolve(__dirname, '../../migrations.sql');

  if (!fs.existsSync(dbPath)) {
    const db = new Database(dbPath);
    const migrations = fs.readFileSync(migrationsPath, 'utf-8');
    db.exec(migrations);
    db.close();
    console.log("Database created and migrations applied.");
  } else {
    console.log("Database already exists.");
  }
}

export async function teardown() {
  console.log("Teardown");
  const dbPath = path.resolve(__dirname, 'gut_punch.db');
  const shm = path.resolve(__dirname, 'gut_punch.db-shm');
  const wal = path.resolve(__dirname, 'gut_punch.db-wal');

  const deleteWithRetry = (filePath: string, maxRetries: number = 3) => {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted ${filePath}`);
          return true;
        }
        return true;
      } catch (error: any) {
        retries++;
        if (retries === maxRetries) {
          console.error(`Failed to delete ${filePath} after ${maxRetries} attempts:`, error);
          return false;
        }
      }
    }
    return false;
  };

  // Delete files in reverse order (WAL, SHM, then main DB)
  deleteWithRetry(wal);
  deleteWithRetry(shm);
  deleteWithRetry(dbPath);

  console.log("Database cleanup completed");
}