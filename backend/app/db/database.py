import os
import aiosqlite
import logging
from typing import AsyncGenerator
from contextlib import asynccontextmanager
from app.core.config import settings

logger = logging.getLogger(__name__)

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_token_hash TEXT UNIQUE NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_type TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_lookup ON auth_tokens(token_type, token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id, token_type);

CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 1,
    window_start REAL NOT NULL
);
"""

def get_db_path() -> str:
    """Return the absolute path to the SQLite database file, creating directory if needed."""
    db_path = settings.DATABASE_PATH
    if not os.path.isabs(db_path):
        # Resolve relative to backend directory
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        db_path = os.path.join(base_dir, db_path)

    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    return db_path

@asynccontextmanager
async def get_db_connection() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Provide an asynchronous connection to the SQLite database."""
    db_path = get_db_path()
    conn = await aiosqlite.connect(db_path)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
    finally:
        await conn.close()

async def init_db() -> None:
    """Initialize database schema and indices."""
    db_path = get_db_path()
    logger.info(f"Initializing SuchnaSetu AI database at: {db_path}")
    async with get_db_connection() as conn:
        await conn.executescript(SCHEMA_SQL)
        await conn.commit()
    logger.info("Database schema and tables initialized successfully.")
