-- A callback can arrive before the send request's response is persisted.
CREATE TABLE pushplus_receipts (
  short_code TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('sent','failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
