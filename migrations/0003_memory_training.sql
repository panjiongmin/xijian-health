CREATE TABLE IF NOT EXISTS memory_decks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_memory_decks_user_created
  ON memory_decks(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS memory_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  deck_id TEXT,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'learning',
  tags TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  lapse_count INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (deck_id) REFERENCES memory_decks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_items_due
  ON memory_items(user_id, status, next_review_at ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_memory_items_user_created
  ON memory_items(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS memory_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'recall',
  item_count INTEGER NOT NULL DEFAULT 0,
  remembered_count INTEGER NOT NULL DEFAULT 0,
  forgotten_count INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  client_session_id TEXT UNIQUE NOT NULL,
  local_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_sessions_user_date
  ON memory_sessions(user_id, local_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS memory_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  session_id TEXT,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 0 AND 3),
  response_ms INTEGER,
  local_date TEXT NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_review_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES memory_items(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES memory_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_reviews_user_date
  ON memory_reviews(user_id, local_date DESC, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_reviews_item
  ON memory_reviews(item_id, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS memory_palaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  scene_type TEXT NOT NULL DEFAULT 'home',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_palaces_user_created
  ON memory_palaces(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS memory_loci (
  id TEXT PRIMARY KEY,
  palace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  position_order INTEGER NOT NULL,
  description TEXT,
  item_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (palace_id) REFERENCES memory_palaces(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES memory_items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_loci_palace_order
  ON memory_loci(palace_id, position_order ASC);
