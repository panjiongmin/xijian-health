-- Preserve existing users, sessions and historical health records.
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  weekday_mask INTEGER NOT NULL CHECK(weekday_mask BETWEEN 1 AND 127),
  image_policy TEXT NOT NULL CHECK(image_policy IN ('none', 'optional', 'required')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  start_date TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Freeze the daily plan before edits so historical progress never changes.
CREATE TABLE task_days (
  task_id TEXT NOT NULL REFERENCES tasks(id),
  local_date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_policy TEXT NOT NULL,
  due INTEGER NOT NULL CHECK(due IN (0,1)),
  PRIMARY KEY(task_id, local_date)
);

CREATE TABLE task_uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  object_key TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  task_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, task_id, local_date),
  FOREIGN KEY(task_id, local_date) REFERENCES task_days(task_id, local_date)
);
CREATE INDEX idx_task_checkins_user_date ON task_checkins(user_id, local_date);

CREATE TABLE task_checkin_images (
  checkin_id TEXT NOT NULL REFERENCES task_checkins(id) ON DELETE CASCADE,
  upload_id TEXT NOT NULL REFERENCES task_uploads(id),
  position INTEGER NOT NULL,
  PRIMARY KEY(checkin_id, upload_id)
);

CREATE TABLE reminder_settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  reminder_time TEXT NOT NULL DEFAULT '20:07',
  site_url TEXT NOT NULL DEFAULT ''
);
INSERT INTO reminder_settings(id) VALUES(1);

CREATE TABLE notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  friend_token TEXT UNIQUE,
  binding_code TEXT UNIQUE,
  binding_expires_at TEXT,
  qr_requested_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reminder_deliveries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  local_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('processing','queued','sent','failed')),
  short_code TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, local_date)
);
CREATE INDEX idx_reminder_deliveries_code ON reminder_deliveries(short_code);

-- At most one send request per minute, including concurrent Cron invocations.
CREATE TABLE reminder_slots (
  slot TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pushplus_access_cache (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  access_key TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
