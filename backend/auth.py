"""
TG Bot Builder — Telegram Mini App Authentication & Authorization.
Validates Telegram WebApp initData HMAC-SHA256 signature and provides get_current_user dependency.
"""

import os
import hmac
import json
import time
import urllib.parse
from hashlib import sha256
from pathlib import Path
from dotenv import load_dotenv
from fastapi import Header, HTTPException, Depends, Security
from fastapi.security import APIKeyHeader

import database

# Load environment variables
ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

STUDIO_BOT_TOKEN = os.getenv("STUDIO_BOT_TOKEN", "").strip()
STUDIO_BOT_USERNAME = os.getenv("STUDIO_BOT_USERNAME", "TGBotStudioBot").strip()
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

# Header for Telegram WebApp initData
telegram_init_data_header = APIKeyHeader(name="X-Telegram-Init-Data", auto_error=False)
session_token_header = APIKeyHeader(name="X-Session-Token", auto_error=False)

# Standard mock dev user for local development outside Telegram
DEV_MOCK_TELEGRAM_ID = 999999999
DEV_MOCK_USERNAME = "dev_tester"
DEV_MOCK_FIRST_NAME = "Dev Studio Tester"


def verify_telegram_init_data(init_data: str, bot_token: str) -> dict | None:
    """
    Validate Telegram WebApp initData using HMAC-SHA256.
    Returns parsed user dict on success, None on invalid signature or expired timestamp.
    
    Telegram verification algorithm:
    1. Parse query string into key-value pairs.
    2. Extract and remove 'hash'.
    3. Sort pairs alphabetically by key and join with '\\n' -> data_check_string.
    4. secret_key = HMAC_SHA256("WebAppData", bot_token)
    5. calculated_hash = HMAC_SHA256(secret_key, data_check_string).hexdigest()
    6. compare calculated_hash with hash.
    """
    if not init_data or not bot_token:
        return None

    try:
        parsed = urllib.parse.parse_qs(init_data, keep_blank_values=True)
        # Convert list values to single strings
        data_dict = {k: v[0] for k, v in parsed.items()}

        received_hash = data_dict.pop("hash", None)
        if not received_hash:
            return None

        # Build data check string: key=value sorted alphabetically
        items = sorted(data_dict.items())
        data_check_string = "\n".join(f"{k}={v}" for k, v in items)

        # secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
        secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), sha256).digest()

        # calculated_hash = HMAC_SHA256(key=secret_key, data=data_check_string)
        calculated_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), sha256).hexdigest()

        if not hmac.compare_digest(calculated_hash, received_hash):
            return None

        # Check auth_date expiration (valid for 24 hours in production, 7 days in dev)
        auth_date = int(data_dict.get("auth_date", 0))
        max_age = 86400 * 7 if ENVIRONMENT == "development" else 86400
        if time.time() - auth_date > max_age:
            return None

        # Parse user JSON
        user_str = data_dict.get("user")
        if not user_str:
            return None

        user_data = json.loads(user_str)
        return user_data

    except Exception:
        return None


def get_current_user(
    init_data_header: str | None = Header(None, alias="X-Telegram-Init-Data"),
    session_token: str | None = Header(None, alias="X-Session-Token"),
) -> dict:
    """
    FastAPI dependency for authenticating users.
    1. First tries Telegram WebApp initData HMAC verification.
    2. Then tries browser auth session token (if user logged in via deep-link).
    3. In development mode (ENVIRONMENT=development), falls back to DEV_MOCK_USER.
    """
    # Normalize values in case function is called directly without FastAPI DI
    if not isinstance(init_data_header, str):
        init_data_header = None
    if not isinstance(session_token, str):
        session_token = None
    # 1. Telegram WebApp initData
    if init_data_header:
        # Check if real initData
        if STUDIO_BOT_TOKEN:
            tg_user = verify_telegram_init_data(init_data_header, STUDIO_BOT_TOKEN)
            if tg_user:
                db_user = database.upsert_user(
                    telegram_id=tg_user["id"],
                    username=tg_user.get("username", ""),
                    first_name=tg_user.get("first_name", ""),
                    photo_url=tg_user.get("photo_url", ""),
                )
                db_user["is_dev"] = False
                return db_user

        # If in dev mode and client explicitly requested dev fallback or invalid initData
        if ENVIRONMENT == "development" and init_data_header in ("dev_mode", "mock", "test"):
            db_user = database.upsert_user(
                telegram_id=DEV_MOCK_TELEGRAM_ID,
                username=DEV_MOCK_USERNAME,
                first_name=DEV_MOCK_FIRST_NAME,
            )
            db_user["is_dev"] = True
            return db_user

    # 2. Browser session token
    if session_token:
        session = database.get_auth_session(session_token)
        if session and session["status"] == "confirmed" and session["user_id"]:
            db_user = database.get_user_by_id(session["user_id"])
            if db_user:
                db_user["is_dev"] = False
                return db_user

    # 3. Dev-mode fallback for local browser development
    if ENVIRONMENT == "development":
        db_user = database.upsert_user(
            telegram_id=DEV_MOCK_TELEGRAM_ID,
            username=DEV_MOCK_USERNAME,
            first_name=DEV_MOCK_FIRST_NAME,
        )
        # Give dev user initial tokens for development testing if wallet is empty
        if db_user.get("balance", 0) == 0:
            database.modify_wallet_balance(db_user["id"], 50, "dev_welcome_grant")
            db_user["balance"] = 50
        db_user["is_dev"] = True
        return db_user

    # In production, require valid authentication
    raise HTTPException(
        status_code=401,
        detail="Authentication required. Please open this app inside Telegram or sign in.",
        headers={"WWW-Authenticate": "Telegram-Init-Data"},
    )
