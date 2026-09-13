"""
TG Bot Builder — SQLite Database Module.
Manages bot records, Stars ledger, and analytics queries.
"""

import sqlite3
import time
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).parent / "data" / "botbuilder.db"


def _ensure_dir():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)


@contextmanager
def get_db():
    """Context manager for database connections."""
    _ensure_dir()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Create tables if they don't exist."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS bots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL DEFAULT 'my-bot',
                username TEXT DEFAULT '',
                bot_type TEXT NOT NULL,
                token_masked TEXT DEFAULT '',
                link TEXT DEFAULT '',
                lang TEXT DEFAULT 'uk',
                created_at REAL NOT NULL,
                total_stars_earned INTEGER DEFAULT 0,
                active_users INTEGER DEFAULT 0,
                status TEXT DEFAULT 'STANDBY'
            );

            CREATE TABLE IF NOT EXISTS stars_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id INTEGER NOT NULL,
                amount_stars INTEGER NOT NULL,
                user_tg_id TEXT DEFAULT '',
                item_title TEXT DEFAULT '',
                timestamp REAL NOT NULL,
                FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_ledger_bot ON stars_ledger(bot_id);
            CREATE INDEX IF NOT EXISTS idx_bots_type ON bots(bot_type);
        """)


# ─── Bot CRUD ────────────────────────────────────────────────────────

def add_bot(name: str, bot_type: str, token: str = "", lang: str = "uk") -> int:
    """Insert a new bot record and return its ID."""
    # Mask the token: show first 6 and last 4 chars
    masked = ""
    if token and len(token) > 12:
        masked = token[:6] + "..." + token[-4:]
    elif token:
        masked = token[:4] + "..."

    username = ""
    link = ""

    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO bots (name, username, bot_type, token_masked, link, lang, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (name, username, bot_type, masked, link, lang, time.time()),
        )
        return cursor.lastrowid


def update_bot_username(bot_id: int, username: str):
    """Update bot username and link after token validation."""
    link = f"https://t.me/{username}" if username else ""
    with get_db() as conn:
        conn.execute(
            "UPDATE bots SET username = ?, link = ? WHERE id = ?",
            (username, link, bot_id),
        )


def set_bot_status(bot_id: int, status: str):
    """Set bot status (ONLINE / STANDBY / OFFLINE)."""
    with get_db() as conn:
        conn.execute("UPDATE bots SET status = ? WHERE id = ?", (status, bot_id))


def get_all_bots() -> list[dict]:
    """Return all bots as list of dicts."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM bots ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def get_bot(bot_id: int) -> dict | None:
    """Return a single bot by ID."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM bots WHERE id = ?", (bot_id,)).fetchone()
        return dict(row) if row else None


def delete_bot(bot_id: int):
    """Delete a bot and its ledger entries."""
    with get_db() as conn:
        conn.execute("DELETE FROM bots WHERE id = ?", (bot_id,))


# ─── Stars Ledger ────────────────────────────────────────────────────

def add_stars_transaction(bot_id: int, amount: int, user_tg_id: str = "", item_title: str = ""):
    """Record a Stars payment transaction."""
    with get_db() as conn:
        conn.execute(
            """INSERT INTO stars_ledger (bot_id, amount_stars, user_tg_id, item_title, timestamp)
               VALUES (?, ?, ?, ?, ?)""",
            (bot_id, amount, user_tg_id, item_title, time.time()),
        )
        # Update total on bot
        conn.execute(
            "UPDATE bots SET total_stars_earned = total_stars_earned + ? WHERE id = ?",
            (amount, bot_id),
        )


def get_bot_ledger(bot_id: int) -> list[dict]:
    """Get Stars transaction history for a bot."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM stars_ledger WHERE bot_id = ? ORDER BY timestamp DESC",
            (bot_id,),
        ).fetchall()
        return [dict(r) for r in rows]


# ─── Analytics ───────────────────────────────────────────────────────

def get_analytics_summary() -> dict:
    """Return overall analytics summary."""
    with get_db() as conn:
        total_bots = conn.execute("SELECT COUNT(*) FROM bots").fetchone()[0]
        total_stars = conn.execute(
            "SELECT COALESCE(SUM(total_stars_earned), 0) FROM bots"
        ).fetchone()[0]
        total_transactions = conn.execute(
            "SELECT COUNT(*) FROM stars_ledger"
        ).fetchone()[0]
        online_bots = conn.execute(
            "SELECT COUNT(*) FROM bots WHERE status = 'ONLINE'"
        ).fetchone()[0]

        # Type breakdown
        type_rows = conn.execute(
            "SELECT bot_type, COUNT(*) as cnt FROM bots GROUP BY bot_type"
        ).fetchall()
        type_breakdown = {r["bot_type"]: r["cnt"] for r in type_rows}

        return {
            "total_bots": total_bots,
            "total_stars": total_stars,
            "total_transactions": total_transactions,
            "online_bots": online_bots,
            "type_breakdown": type_breakdown,
        }
