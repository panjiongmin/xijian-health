ALTER TABLE reminder_settings ADD COLUMN provider TEXT NOT NULL DEFAULT 'pushplus';
ALTER TABLE reminder_settings ADD COLUMN webhook_url TEXT NOT NULL DEFAULT '';
ALTER TABLE reminder_settings ADD COLUMN webhook_token TEXT NOT NULL DEFAULT '';

CREATE TABLE webhook_deliveries (
  local_date TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('processing','accepted','failed')),
  error_code TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
