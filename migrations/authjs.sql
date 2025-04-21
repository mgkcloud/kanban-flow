CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  emailVerified INTEGER,
  image TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  userId TEXT,
  type TEXT,
  provider TEXT,
  providerAccountId TEXT,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  PRIMARY KEY (provider, providerAccountId)
);

CREATE TABLE IF NOT EXISTS sessions (
  sessionToken TEXT PRIMARY KEY,
  userId TEXT,
  expires INTEGER
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT,
  token TEXT,
  expires INTEGER,
  PRIMARY KEY (identifier, token)
); 