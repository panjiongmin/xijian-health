ALTER TABLE memory_palaces ADD COLUMN image_key TEXT;
ALTER TABLE memory_palaces ADD COLUMN image_prompt TEXT;
ALTER TABLE memory_palaces ADD COLUMN image_model TEXT;
ALTER TABLE memory_palaces ADD COLUMN layout_json TEXT;
ALTER TABLE memory_palaces ADD COLUMN generated_at TEXT;

CREATE TABLE IF NOT EXISTS memory_ai_generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  palace_id TEXT,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  output_key TEXT,
  output_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (palace_id) REFERENCES memory_palaces(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_ai_generations_user_created
  ON memory_ai_generations(user_id, created_at DESC);
