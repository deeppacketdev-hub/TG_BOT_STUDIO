"""
TG Bot Builder — SQLite Database Module.
Manages bot records, users, token wallets, Stars ledger, and analytics.
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
    """Create tables and perform schema migrations."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE NOT NULL,
                username TEXT DEFAULT '',
                first_name TEXT DEFAULT '',
                photo_url TEXT DEFAULT '',
                created_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS token_wallets (
                user_id INTEGER PRIMARY KEY,
                balance INTEGER DEFAULT 0,
                updated_at REAL NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS token_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                delta INTEGER NOT NULL,
                reason TEXT NOT NULL,
                ref_id TEXT DEFAULT '',
                created_at REAL NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS auth_sessions (
                session_id TEXT PRIMARY KEY,
                telegram_id INTEGER DEFAULT NULL,
                user_id INTEGER DEFAULT NULL,
                status TEXT DEFAULT 'pending',
                created_at REAL NOT NULL,
                expires_at REAL NOT NULL
            );

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
                status TEXT DEFAULT 'STANDBY',
                owner_user_id INTEGER DEFAULT NULL,
                FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
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
            CREATE INDEX IF NOT EXISTS idx_users_tg ON users(telegram_id);
            CREATE INDEX IF NOT EXISTS idx_token_tx_user ON token_transactions(user_id);
        """)

        # Migration: check if owner_user_id column exists in bots table (for existing databases)
        table_info = conn.execute("PRAGMA table_info(bots)").fetchall()
        columns = [row["name"] for row in table_info]
        if "owner_user_id" not in columns:
            conn.execute("ALTER TABLE bots ADD COLUMN owner_user_id INTEGER DEFAULT NULL REFERENCES users(id)")

        conn.execute("CREATE INDEX IF NOT EXISTS idx_bots_owner ON bots(owner_user_id)")


# ─── User & Wallet Management ────────────────────────────────────────

def upsert_user(telegram_id: int, username: str = "", first_name: str = "", photo_url: str = "") -> dict:
    """Create or update a user and ensure they have a token wallet."""
    now = time.time()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,)).fetchone()
        if row:
            user_id = row["id"]
            conn.execute(
                """UPDATE users SET username = ?, first_name = ?, photo_url = ?
                   WHERE id = ?""",
                (username or row["username"], first_name or row["first_name"], photo_url or row["photo_url"], user_id),
            )
        else:
            cursor = conn.execute(
                """INSERT INTO users (telegram_id, username, first_name, photo_url, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (telegram_id, username, first_name, photo_url, now),
            )
            user_id = cursor.lastrowid

            # Create wallet with initial 0 balance (or starting bonus in dev mode)
            conn.execute(
                """INSERT OR IGNORE INTO token_wallets (user_id, balance, updated_at)
                   VALUES (?, 0, ?)""",
                (user_id, now),
            )

        # Retrieve full user profile with wallet
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        wallet = conn.execute("SELECT * FROM token_wallets WHERE user_id = ?", (user_id,)).fetchone()
        res = dict(user)
        res["balance"] = wallet["balance"] if wallet else 0
        return res


def get_user_by_telegram_id(telegram_id: int) -> dict | None:
    """Find user by their Telegram ID."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,)).fetchone()
        if not row:
            return None
        wallet = conn.execute("SELECT * FROM token_wallets WHERE user_id = ?", (row["id"],)).fetchone()
        res = dict(row)
        res["balance"] = wallet["balance"] if wallet else 0
        return res


def get_user_by_id(user_id: int) -> dict | None:
    """Find user by internal database ID."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            return None
        wallet = conn.execute("SELECT * FROM token_wallets WHERE user_id = ?", (user_id,)).fetchone()
        res = dict(row)
        res["balance"] = wallet["balance"] if wallet else 0
        return res


def modify_wallet_balance(user_id: int, delta: int, reason: str, ref_id: str = "") -> tuple[bool, int]:
    """
    Atomically modify token wallet balance and record an append-only transaction.
    Returns (success: bool, new_balance: int).
    Fails if delta is negative and would cause balance < 0.
    """
    now = time.time()
    with get_db() as conn:
        wallet = conn.execute("SELECT balance FROM token_wallets WHERE user_id = ?", (user_id,)).fetchone()
        current_balance = wallet["balance"] if wallet else 0

        new_balance = current_balance + delta
        if new_balance < 0:
            return False, current_balance

        conn.execute(
            """INSERT INTO token_wallets (user_id, balance, updated_at)
               VALUES (?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET balance = ?, updated_at = ?""",
            (user_id, new_balance, now, new_balance, now),
        )

        conn.execute(
            """INSERT INTO token_transactions (user_id, delta, reason, ref_id, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, delta, reason, str(ref_id), now),
        )

        return True, new_balance


def get_wallet_transactions(user_id: int, limit: int = 50) -> list[dict]:
    """Get history of token transactions for a user."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM token_transactions
               WHERE user_id = ?
               ORDER BY created_at DESC LIMIT ?""",
            (user_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]


# ─── Browser Auth Sessions (Fallback) ────────────────────────────────

def create_auth_session(session_id: str, expires_in_sec: int = 600):
    """Register a new pending browser login session."""
    now = time.time()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO auth_sessions (session_id, status, created_at, expires_at)
               VALUES (?, 'pending', ?, ?)""",
            (session_id, now, now + expires_in_sec),
        )


def confirm_auth_session(session_id: str, telegram_id: int, user_id: int) -> bool:
    """Mark session as authenticated by Telegram user."""
    now = time.time()
    with get_db() as conn:
        cur = conn.execute(
            """UPDATE auth_sessions
               SET status = 'confirmed', telegram_id = ?, user_id = ?
               WHERE session_id = ? AND expires_at > ? AND status = 'pending'""",
            (telegram_id, user_id, session_id, now),
        )
        return cur.rowcount > 0


def get_auth_session(session_id: str) -> dict | None:
    """Retrieve auth session info."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM auth_sessions WHERE session_id = ?", (session_id,)).fetchone()
        return dict(row) if row else None


# ─── Bot CRUD ────────────────────────────────────────────────────────

def add_bot(name: str, bot_type: str, token: str = "", lang: str = "uk", owner_user_id: int | None = None) -> int:
    """Insert a new bot record and return its ID."""
    masked = ""
    if token and len(token) > 12:
        masked = token[:6] + "..." + token[-4:]
    elif token:
        masked = token[:4] + "..."

    username = ""
    link = ""

    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO bots (name, username, bot_type, token_masked, link, lang, created_at, owner_user_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (name, username, bot_type, masked, link, lang, time.time(), owner_user_id),
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


def get_all_bots(owner_user_id: int | None = None) -> list[dict]:
    """
    Return all bots. If owner_user_id is provided, only returns bots owned by that user
    (or legacy unowned bots if specified).
    """
    with get_db() as conn:
        if owner_user_id is not None:
            rows = conn.execute(
                """SELECT * FROM bots 
                   WHERE owner_user_id = ? OR owner_user_id IS NULL 
                   ORDER BY created_at DESC""",
                (owner_user_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM bots ORDER BY created_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]


def get_bot(bot_id: int, owner_user_id: int | None = None) -> dict | None:
    """Return a single bot by ID with optional owner check."""
    with get_db() as conn:
        if owner_user_id is not None:
            row = conn.execute(
                "SELECT * FROM bots WHERE id = ? AND (owner_user_id = ? OR owner_user_id IS NULL)",
                (bot_id, owner_user_id),
            ).fetchone()
        else:
            row = conn.execute("SELECT * FROM bots WHERE id = ?", (bot_id,)).fetchone()
        return dict(row) if row else None


def delete_bot(bot_id: int, owner_user_id: int | None = None) -> bool:
    """Delete a bot and its ledger entries."""
    with get_db() as conn:
        if owner_user_id is not None:
            cur = conn.execute(
                "DELETE FROM bots WHERE id = ? AND (owner_user_id = ? OR owner_user_id IS NULL)",
                (bot_id, owner_user_id),
            )
            return cur.rowcount > 0
        else:
            cur = conn.execute("DELETE FROM bots WHERE id = ?", (bot_id,))
            return cur.rowcount > 0


# ─── Stars Ledger ────────────────────────────────────────────────────

def add_stars_transaction(bot_id: int, amount: int, user_tg_id: str = "", item_title: str = ""):
    """Record a Stars payment transaction."""
    with get_db() as conn:
        conn.execute(
            """INSERT INTO stars_ledger (bot_id, amount_stars, user_tg_id, item_title, timestamp)
               VALUES (?, ?, ?, ?, ?)""",
            (bot_id, amount, user_tg_id, item_title, time.time()),
        )
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

def get_analytics_summary(owner_user_id: int | None = None) -> dict:
    """Return overall or owner-scoped analytics summary."""
    with get_db() as conn:
        filter_clause = "WHERE owner_user_id = ? OR owner_user_id IS NULL" if owner_user_id is not None else ""
        params = (owner_user_id,) if owner_user_id is not None else ()

        total_bots = conn.execute(f"SELECT COUNT(*) FROM bots {filter_clause}", params).fetchone()[0]
        total_stars = conn.execute(
            f"SELECT COALESCE(SUM(total_stars_earned), 0) FROM bots {filter_clause}",
            params,
        ).fetchone()[0]

        online_clause = f"{filter_clause} AND status = 'ONLINE'" if filter_clause else "WHERE status = 'ONLINE'"
        online_bots = conn.execute(f"SELECT COUNT(*) FROM bots {online_clause}", params).fetchone()[0]

        type_rows = conn.execute(
            f"SELECT bot_type, COUNT(*) as cnt FROM bots {filter_clause} GROUP BY bot_type",
            params,
        ).fetchall()
        type_breakdown = {r["bot_type"]: r["cnt"] for r in type_rows}

        # Transactions
        if owner_user_id is not None:
            total_transactions = conn.execute(
                """SELECT COUNT(*) FROM stars_ledger sl
                   JOIN bots b ON sl.bot_id = b.id
                   WHERE b.owner_user_id = ? OR b.owner_user_id IS NULL""",
                (owner_user_id,),
            ).fetchone()[0]
        else:
            total_transactions = conn.execute("SELECT COUNT(*) FROM stars_ledger").fetchone()[0]

        return {
            "total_bots": total_bots,
            "total_stars": total_stars,
            "total_transactions": total_transactions,
            "online_bots": online_bots,
            "type_breakdown": type_breakdown,
        }
