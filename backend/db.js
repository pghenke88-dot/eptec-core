// scripts/db.js
// EPTEC SQLite DB – FINAL (clean init + promised helpers)

import sqlite3 from "sqlite3";

sqlite3.verbose();

const DB_FILE = process.env.DB_FILE || "./eptec.db";

// keep a single shared connection
export const db = new sqlite3.Database(DB_FILE);

export function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        first_name TEXT,
        last_name TEXT,
        birthdate TEXT,
        pass_hash TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens(token);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
  });
}

export function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

export function closeDb() {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve(true)));
  });
}
