CREATE TABLE IF NOT EXISTS status_webhooks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL,
  url TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS status_webhooks_project_status_idx ON status_webhooks(project_id, status);
