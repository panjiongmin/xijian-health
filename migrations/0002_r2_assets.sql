CREATE TABLE IF NOT EXISTS asset_uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('avatar', 'community', 'nutrition')),
  object_key TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  original_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_asset_uploads_user_kind_created
  ON asset_uploads(user_id, kind, created_at DESC);

ALTER TABLE community_profiles ADD COLUMN avatar_asset_id TEXT;
ALTER TABLE community_profiles ADD COLUMN avatar_image_key TEXT;

ALTER TABLE community_posts ADD COLUMN image_asset_id TEXT;
ALTER TABLE community_posts ADD COLUMN image_key TEXT;
