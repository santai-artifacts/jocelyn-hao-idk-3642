import Database from "bun:sqlite";
import { mkdirSync } from "fs";

mkdirSync("./data", { recursive: true });

const db = new Database(process.env.DATABASE_URL || "./data/cinelog.db");

db.exec(`PRAGMA journal_mode=WAL;`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_color TEXT DEFAULT '#14b8a6',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_id TEXT NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 10),
    review TEXT DEFAULT '',
    liked INTEGER DEFAULT 0,
    watched_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, movie_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_id TEXT NOT NULL,
    added_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, movie_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id),
    FOREIGN KEY (following_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS list_movies (
    list_id INTEGER NOT NULL,
    movie_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (list_id, movie_id),
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
  );
`);

// Seed demo users
const existingUser = db.query("SELECT id FROM users WHERE username = 'demo'").get();
if (!existingUser) {
  db.exec(`
    INSERT INTO users (username, display_name, bio, avatar_color) VALUES
      ('demo', 'Demo User', 'Film enthusiast & cinephile. 🎬', '#14b8a6'),
      ('filmcritic', 'Film Critic', 'Professional reviewer. A24 stan.', '#8b5cf6'),
      ('cinematica', 'Cinematica', 'Obsessed with cinematography and visual storytelling.', '#f59e0b');
  `);

  // Seed some diary entries for demo user
  const demoMovies = [
    { id: 'tt0111161', rating: 10, review: 'A masterpiece. The greatest film ever made. Andy Dufresne gives me hope every single time.', liked: 1, date: '2026-01-15' },
    { id: 'tt0068646', rating: 9, review: 'Coppola at his absolute peak. The family dynamics are unparalleled.', liked: 1, date: '2026-01-22' },
    { id: 'tt0468569', rating: 10, review: 'Ledger\'s Joker is the defining performance of modern cinema. Nolan delivered something special.', liked: 1, date: '2026-02-03' },
    { id: 'tt1375666', rating: 8, review: 'Mind-bending in the best way. Second watch reveals so much more.', liked: 0, date: '2026-02-10' },
    { id: 'tt0110912', rating: 9, review: 'Tarantino\'s sharp writing has never been better. The dialogue alone is worth the watch.', liked: 1, date: '2026-02-18' },
    { id: 'tt0137523', rating: 9, review: 'First rule of Fight Club: never shut up about Fight Club.', liked: 1, date: '2026-03-01' },
    { id: 'tt0245429', rating: 10, review: 'Miyazaki\'s imagination knows no bounds. Absolute animation perfection.', liked: 1, date: '2026-03-10' },
    { id: 'tt0816692', rating: 7, review: 'Visually stunning. The docking scene alone is worth the watch.', liked: 0, date: '2026-03-20' },
  ];

  const insertEntry = db.prepare(`
    INSERT OR IGNORE INTO diary_entries (user_id, movie_id, rating, review, liked, watched_date)
    VALUES (1, ?, ?, ?, ?, ?)
  `);
  for (const m of demoMovies) {
    insertEntry.run(m.id, m.rating, m.review, m.liked, m.date);
  }

  // Watchlist for demo
  const watchlistItems = ['tt0109830', 'tt0120737', 'tt0167260', 'tt0133093', 'tt0482571'];
  const insertWatch = db.prepare(`INSERT OR IGNORE INTO watchlist (user_id, movie_id) VALUES (1, ?)`);
  for (const id of watchlistItems) insertWatch.run(id);

  // Follow relationships
  db.exec(`INSERT OR IGNORE INTO follows VALUES (1, 2, datetime('now')), (1, 3, datetime('now')), (2, 1, datetime('now'))`);

  // Create a list
  db.exec(`INSERT INTO lists (user_id, name, description) VALUES (1, 'All-Time Favorites', 'The films that changed how I see cinema.')`);
  const listMovies = ['tt0111161', 'tt0068646', 'tt0468569', 'tt0245429', 'tt0110912'];
  const insertListMovie = db.prepare(`INSERT OR IGNORE INTO list_movies VALUES (1, ?, ?)`);
  listMovies.forEach((id, i) => insertListMovie.run(id, i + 1));
}

export default db;
