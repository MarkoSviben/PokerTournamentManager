import db from './database';

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blind_structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES admins(id)
    );

    CREATE TABLE IF NOT EXISTS blind_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      structure_id INTEGER NOT NULL,
      level_order INTEGER NOT NULL,
      small_blind INTEGER NOT NULL,
      big_blind INTEGER NOT NULL,
      ante INTEGER NOT NULL DEFAULT 0,
      duration_minutes INTEGER NOT NULL,
      is_break INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (structure_id) REFERENCES blind_structures(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES admins(id)
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'registration',
      gtd INTEGER NOT NULL DEFAULT 0,
      rake_percent REAL NOT NULL DEFAULT 0,
      buyin_amount INTEGER NOT NULL,
      starting_chips INTEGER NOT NULL,
      rebuy_enabled INTEGER NOT NULL DEFAULT 0,
      rebuy_cost INTEGER NOT NULL DEFAULT 0,
      rebuy_chips INTEGER NOT NULL DEFAULT 0,
      addon_enabled INTEGER NOT NULL DEFAULT 0,
      addon_cost INTEGER NOT NULL DEFAULT 0,
      addon_chips INTEGER NOT NULL DEFAULT 0,
      blind_structure_id INTEGER NOT NULL,
      auto_seating INTEGER NOT NULL DEFAULT 1,
      current_level INTEGER NOT NULL DEFAULT 1,
      level_started_at TEXT,
      elapsed_seconds_before_current INTEGER NOT NULL DEFAULT 0,
      level_elapsed_on_pause INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      finished_at TEXT,
      FOREIGN KEY (admin_id) REFERENCES admins(id),
      FOREIGN KEY (blind_structure_id) REFERENCES blind_structures(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      table_number INTEGER NOT NULL,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tournament_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      table_id INTEGER,
      seat_number INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      eliminated_at TEXT,
      eliminated_position INTEGER,
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (table_id) REFERENCES tournament_tables(id)
    );

    CREATE TABLE IF NOT EXISTS rebuys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      entry_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (entry_id) REFERENCES tournament_entries(id)
    );

    CREATE TABLE IF NOT EXISTS addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      entry_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (entry_id) REFERENCES tournament_entries(id)
    );

    CREATE TABLE IF NOT EXISTS payout_structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      percentage REAL NOT NULL,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      entry_id INTEGER NOT NULL,
      ticket_type TEXT NOT NULL,
      ticket_number INTEGER NOT NULL DEFAULT 0,
      amount INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (entry_id) REFERENCES tournament_entries(id)
    );
  `);

  // Migration: add ticket_number column if missing
  try {
    db.prepare("SELECT ticket_number FROM tickets LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE tickets ADD COLUMN ticket_number INTEGER NOT NULL DEFAULT 0");
  }

  // Migration: add level_elapsed_on_pause column if missing
  try {
    db.prepare("SELECT level_elapsed_on_pause FROM tournaments LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE tournaments ADD COLUMN level_elapsed_on_pause INTEGER NOT NULL DEFAULT 0");
  }

  // Migration: add admin_id to players if missing
  try {
    db.prepare("SELECT admin_id FROM players LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE players ADD COLUMN admin_id INTEGER NOT NULL DEFAULT 1");
  }

  // Migration: add email column if missing (old schema didn't have it)
  try {
    db.prepare("SELECT email FROM admins LIMIT 0").get();
  } catch {
    db.exec("ALTER TABLE admins ADD COLUMN email TEXT");
    db.exec("UPDATE admins SET email = username || '@local' WHERE email IS NULL");
  }
}
