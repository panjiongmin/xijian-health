PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_code TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_sec INTEGER NOT NULL,
  left_completed INTEGER NOT NULL DEFAULT 0,
  right_completed INTEGER NOT NULL DEFAULT 0,
  exit_reason TEXT,
  client_session_id TEXT UNIQUE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_user_started
  ON training_sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_code TEXT NOT NULL,
  local_date TEXT NOT NULL,
  training_session_id TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (training_session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
  UNIQUE(user_id, product_code, local_date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_date
  ON checkins(user_id, local_date DESC);

CREATE TABLE IF NOT EXISTS community_profiles (
  user_id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  avatar_code TEXT NOT NULL,
  bio TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  checkin_id TEXT NOT NULL,
  product_code TEXT NOT NULL,
  local_date TEXT NOT NULL,
  duration_bucket TEXT,
  public_streak INTEGER,
  public_week_count INTEGER,
  public_total_count INTEGER,
  note TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  moderation_status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (checkin_id) REFERENCES checkins(id) ON DELETE CASCADE,
  UNIQUE(user_id, checkin_id)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_feed
  ON community_posts(visibility, moderation_status, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS community_reactions (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  moderation_status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_post_created
  ON community_comments(post_id, created_at ASC);

CREATE TABLE IF NOT EXISTS community_follows (
  follower_id TEXT NOT NULL,
  followed_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(follower_id, followed_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK(follower_id <> followed_id)
);

CREATE TABLE IF NOT EXISTS community_blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK(blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS community_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO users (id, email, password_hash, display_name, status)
VALUES
  ('seed-ning', 'seed-ning@xijian.local', NULL, '宁一', 'seed'),
  ('seed-yuhe', 'seed-yuhe@xijian.local', NULL, '雨禾', 'seed'),
  ('seed-qiaomu', 'seed-qiaomu@xijian.local', NULL, '乔木', 'seed');

INSERT OR IGNORE INTO community_profiles (user_id, nickname, avatar_code, bio, visibility)
VALUES
  ('seed-ning', '宁一', 'moss', '在屏幕和窗外之间，给眼睛一点空隙。', 'public'),
  ('seed-yuhe', '雨禾', 'pond', '把小习惯放进普通的一天。', 'public'),
  ('seed-qiaomu', '乔木', 'fern', '慢慢来，也算在前进。', 'public');

INSERT OR IGNORE INTO training_sessions
  (id, user_id, product_code, started_at, completed_at, duration_sec, left_completed, right_completed, client_session_id)
VALUES
  ('seed-session-1', 'seed-ning', 'eye-focus', datetime('now', '-24 minutes'), datetime('now', '-21 minutes'), 160, 1, 1, 'seed-client-1'),
  ('seed-session-2', 'seed-yuhe', 'eye-focus', datetime('now', '-3 hours'), datetime('now', '-3 hours'), 160, 1, 1, 'seed-client-2'),
  ('seed-session-3', 'seed-qiaomu', 'eye-focus', datetime('now', '-1 day'), datetime('now', '-1 day'), 160, 1, 1, 'seed-client-3');

INSERT OR IGNORE INTO checkins
  (id, user_id, product_code, local_date, training_session_id, duration_sec)
VALUES
  ('seed-checkin-1', 'seed-ning', 'eye-focus', date('now'), 'seed-session-1', 160),
  ('seed-checkin-2', 'seed-yuhe', 'eye-focus', date('now'), 'seed-session-2', 160),
  ('seed-checkin-3', 'seed-qiaomu', 'eye-focus', date('now', '-1 day'), 'seed-session-3', 160);

INSERT OR IGNORE INTO community_posts
  (id, user_id, checkin_id, product_code, local_date, duration_bucket, public_streak, public_week_count, public_total_count, note, created_at)
VALUES
  ('seed-post-1', 'seed-ning', 'seed-checkin-1', 'eye-focus', date('now'), '约 3 分钟', 6, 4, 18, '做完以后去窗边看了会儿远处，刚好赶上天色变暗。', datetime('now', '-21 minutes')),
  ('seed-post-2', 'seed-yuhe', 'seed-checkin-2', 'eye-focus', date('now'), '约 3 分钟', 3, 3, 11, '午休前完成，下午继续慢慢做事。', datetime('now', '-3 hours')),
  ('seed-post-3', 'seed-qiaomu', 'seed-checkin-3', 'eye-focus', date('now', '-1 day'), '约 3 分钟', 2, 2, 7, '没有追求连续，只是今天又想起来了。', datetime('now', '-1 day'));
