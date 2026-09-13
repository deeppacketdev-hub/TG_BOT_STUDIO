"""
TG Bot Builder — FastAPI Backend.
API для генерації Telegram-ботів, валідації токенів, авторизації TMA та обслуговування фронтенду.
"""

import hashlib
import hmac
import os
import shutil
import time
import uuid
from pathlib import Path

import httpx
from fastapi import FastAPI, Request, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import database
from auth import (
    get_current_user,
    STUDIO_BOT_TOKEN,
    STUDIO_BOT_USERNAME,
    ENVIRONMENT,
    DEV_MOCK_TELEGRAM_ID,
)
from generator.engine import generate_bot_zip, get_bot_types_info
import bot_runner

# ─── Конфігурація ───────────────────────────────────────────────────
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

app = FastAPI(
    title="TG Bot Builder",
    description="Конструктор Telegram-ботів — генерація готових проєктів на aiogram 3 з Telegram Mini App авторизацією",
    version="2.0.0",
)

# CORS обмежено конкретними origin згідно критерію ROADMAP V2
ALLOWED_ORIGINS = [
    "https://web.telegram.org",
    "https://oauth.telegram.org",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.telegram\.org",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Ініціалізація бази даних ────────────────────────────────────────
@app.on_event("startup")
async def startup():
    database.init_db()


# ─── In-memory сховище замовлень (legacy для перехідного періоду) ─────
_orders: dict[str, dict] = {}


# ─── Pydantic моделі ────────────────────────────────────────────────
class TokenValidation(BaseModel):
    token: str


class BotConfig(BaseModel):
    bot_type: str
    bot_name: str = "my-telegram-bot"
    bot_token: str = ""
    lang: str = "uk"  # UI language: uk / en / ru
    # Menu bot
    welcome_text: str = ""
    contact_text: str = ""
    menu_items: list = Field(default_factory=list)
    # Feedback bot
    admin_chat_id: str = ""
    # Leadgen bot
    thank_you_text: str = ""
    form_fields: list = Field(default_factory=list)
    services: list = Field(default_factory=list)
    # AI bot
    ai_system_prompt: str = ""
    ai_model: str = "gpt-4o-mini"
    openai_api_key: str = ""
    # Catalog bot
    catalog: list = Field(default_factory=list)
    # Stars shop
    products: list = Field(default_factory=list)


class CreateOrder(BaseModel):
    bot_type: str
    amount: int = 299


class VerifyPayment(BaseModel):
    order_id: str
    payment_status: str = "success"


class SyncStarsRequest(BaseModel):
    bot_id: int
    amount: int
    item_title: str = "Test Item"
    user_tg_id: str = "123456789"


# ─── Auth & Profile Endpoints ────────────────────────────────────────

@app.get("/api/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Повернути поточний профіль користувача, баланс токенів та системні налаштування."""
    return {
        "user": user,
        "studio": {
            "bot_username": STUDIO_BOT_USERNAME,
            "environment": ENVIRONMENT,
            "is_dev": user.get("is_dev", False),
        }
    }


@app.get("/api/wallet")
async def get_wallet_endpoint(user: dict = Depends(get_current_user)):
    """Баланс гаманця користувача та історія транзакцій."""
    txs = database.get_wallet_transactions(user["id"], limit=50)
    return {
        "user_id": user["id"],
        "balance": user.get("balance", 0),
        "transactions": txs,
    }


@app.post("/api/auth/session/create")
async def create_browser_auth_session():
    """Створити сесію для входу через Telegram-бота з браузера."""
    session_id = uuid.uuid4().hex
    database.create_auth_session(session_id, expires_in_sec=600)
    deep_link = f"https://t.me/{STUDIO_BOT_USERNAME}?start=login_{session_id}"
    return {
        "session_id": session_id,
        "deep_link": deep_link,
        "expires_in": 600,
    }


@app.get("/api/auth/session/{session_id}/status")
async def check_browser_auth_session(session_id: str):
    """Перевірити статус сесії входу для браузера."""
    session = database.get_auth_session(session_id)
    if not session:
        return JSONResponse(status_code=404, content={"error": "Session not found"})

    if session["status"] == "confirmed" and session["user_id"]:
        user = database.get_user_by_id(session["user_id"])
        return {
            "status": "confirmed",
            "session_token": session_id,
            "user": user,
        }

    return {"status": session["status"]}


@app.post("/api/auth/session/{session_id}/dev-confirm")
async def dev_confirm_auth_session(session_id: str):
    """Dev-mode підтвердження сесії входу для локального тестування."""
    if ENVIRONMENT != "development":
        raise HTTPException(status_code=403, detail="Available only in development mode")

    dev_user = database.upsert_user(
        telegram_id=DEV_MOCK_TELEGRAM_ID,
        username="dev_tester",
        first_name="Dev Studio Tester",
    )
    ok = database.confirm_auth_session(session_id, telegram_id=DEV_MOCK_TELEGRAM_ID, user_id=dev_user["id"])
    if not ok:
        raise HTTPException(status_code=400, detail="Could not confirm session")

    return {"status": "confirmed", "session_token": session_id, "user": dev_user}


# ─── Bot Types & Validation ──────────────────────────────────────────

@app.get("/api/bot-types")
async def list_bot_types(lang: str = "uk"):
    """Повернути список доступних типів ботів з описами (з урахуванням мови)."""
    return {"types": get_bot_types_info(lang)}


@app.post("/api/validate-token")
async def validate_token(data: TokenValidation):
    """Перевірити валідність Telegram Bot токена через Telegram Bot API."""
    token = data.token.strip()

    if not token or ":" not in token:
        return JSONResponse(
            status_code=400,
            content={"valid": False, "error": "Невірний формат токена. Отримайте токен у @BotFather."},
        )

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            result = resp.json()

        if result.get("ok"):
            bot_info = result["result"]
            return {
                "valid": True,
                "bot": {
                    "id": bot_info["id"],
                    "username": bot_info.get("username", ""),
                    "first_name": bot_info.get("first_name", ""),
                },
            }
        else:
            return JSONResponse(
                status_code=400,
                content={"valid": False, "error": "Токен невалідний або бот не існує."},
            )
    except httpx.TimeoutException:
        return JSONResponse(
            status_code=504,
            content={"valid": False, "error": "Telegram API не відповідає. Спробуйте пізніше."},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"valid": False, "error": f"Помилка перевірки: {str(e)}"},
        )


# ─── Legacy Order/Payment (для зворотньої сумісності) ──────────────────

@app.post("/api/create-order")
async def create_order(data: CreateOrder):
    """Створити замовлення для оплати."""
    order_id = str(uuid.uuid4())[:12]
    _orders[order_id] = {
        "id": order_id,
        "bot_type": data.bot_type,
        "amount": data.amount,
        "status": "pending",
        "created_at": time.time(),
    }
    return {
        "order_id": order_id,
        "amount": data.amount,
        "currency": "UAH",
        "status": "pending",
        "message": f"Замовлення #{order_id} створено. Сума: {data.amount} грн.",
    }


@app.post("/api/verify-payment")
async def verify_payment(data: VerifyPayment):
    """Верифікувати оплату (тестовий режим — завжди успішно)."""
    order = _orders.get(data.order_id)
    if not order:
        return JSONResponse(
            status_code=404,
            content={"verified": False, "error": "Замовлення не знайдено."},
        )

    order["status"] = "paid"
    return {
        "verified": True,
        "order_id": data.order_id,
        "message": "✅ Оплату підтверджено! Тепер ви можете завантажити бота.",
    }


# ─── Генерація та деплой ботів ──────────────────────────────────────

@app.post("/api/generate-bot")
async def generate_bot(config: BotConfig, user: dict = Depends(get_current_user)):
    """Згенерувати ZIP-архів з готовим проєктом бота з прив'язкою до поточного користувача."""
    try:
        cfg = {k: v for k, v in config.model_dump().items() if v or isinstance(v, (int, float, bool))}
        zip_buffer = generate_bot_zip(cfg)

        # Зберігаємо в базі з прив'язкою до власника
        bot_id = database.add_bot(
            name=config.bot_name,
            bot_type=config.bot_type,
            token=config.bot_token,
            lang=config.lang,
            owner_user_id=user["id"],
        )

        filename = f"{config.bot_name or 'telegram-bot'}.zip"
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Bot-Id": str(bot_id) if bot_id else "",
            },
        )
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Помилка генерації: {str(e)}"})


@app.post("/api/deploy-bot")
async def deploy_bot_endpoint(config: BotConfig, user: dict = Depends(get_current_user)):
    """Згенерувати, зберегти на диск, встановити залежності та запустити бота."""
    try:
        cfg = {k: v for k, v in config.model_dump().items() if v or isinstance(v, (int, float, bool))}
        zip_buffer = generate_bot_zip(cfg)

        # Зберігаємо в базі з прив'язкою до користувача
        bot_id = database.add_bot(
            name=config.bot_name,
            bot_type=config.bot_type,
            token=config.bot_token,
            lang=config.lang,
            owner_user_id=user["id"],
        )

        # Deploy to disk
        deploy_info = bot_runner.deploy_bot(bot_id, zip_buffer)

        # Auto-start the bot
        start_result = await bot_runner.start_bot(bot_id)

        return {
            "success": True,
            "bot_id": bot_id,
            "deploy": deploy_info,
            "start": start_result,
        }
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Deploy error: {str(e)}"})


# ─── Керування ботами (Власність перевіряється обов'язково) ────────────

@app.get("/api/bots")
async def list_bots(user: dict = Depends(get_current_user)):
    """Реєстр ботів поточного користувача."""
    bots = database.get_all_bots(owner_user_id=user["id"])
    return {"bots": bots, "total": len(bots)}


@app.get("/api/analytics/summary")
async def analytics_summary(user: dict = Depends(get_current_user)):
    """Загальна аналітика для поточного користувача."""
    return database.get_analytics_summary(owner_user_id=user["id"])


@app.post("/api/bots/sync-stars")
async def sync_stars(data: SyncStarsRequest, user: dict = Depends(get_current_user)):
    """Додати тестову транзакцію Stars для бота (тільки якщо бот належить юзеру)."""
    bot = database.get_bot(data.bot_id, owner_user_id=user["id"])
    if not bot:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this bot")

    database.add_stars_transaction(
        bot_id=data.bot_id,
        amount=data.amount,
        user_tg_id=data.user_tg_id,
        item_title=data.item_title,
    )
    updated = database.get_bot(data.bot_id, owner_user_id=user["id"])
    return {
        "success": True,
        "bot_id": data.bot_id,
        "new_total": updated["total_stars_earned"] if updated else 0,
    }


@app.post("/api/bots/{bot_id}/start")
async def start_bot_endpoint(bot_id: int, user: dict = Depends(get_current_user)):
    """Запустити бота (з перевіркою власності)."""
    bot = database.get_bot(bot_id, owner_user_id=user["id"])
    if not bot:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this bot")

    if not bot_runner.is_deployed(bot_id):
        return JSONResponse(status_code=400, content={"error": "Bot is not deployed. Re-deploy first."})

    result = await bot_runner.start_bot(bot_id)
    return result


@app.post("/api/bots/{bot_id}/stop")
async def stop_bot_endpoint(bot_id: int, user: dict = Depends(get_current_user)):
    """Зупинити бота (з перевіркою власності)."""
    bot = database.get_bot(bot_id, owner_user_id=user["id"])
    if not bot:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this bot")

    result = await bot_runner.stop_bot(bot_id)
    return result


@app.get("/api/bots/{bot_id}/status")
async def bot_status_endpoint(bot_id: int, user: dict = Depends(get_current_user)):
    """Отримати статус бота (з перевіркою власності)."""
    bot = database.get_bot(bot_id, owner_user_id=user["id"])
    if not bot:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this bot")

    return bot_runner.get_bot_status(bot_id)


@app.get("/api/bots/running")
async def running_bots_endpoint(user: dict = Depends(get_current_user)):
    """Список запущених ботів поточного користувача."""
    all_running = bot_runner.get_all_running()
    user_bots = database.get_all_bots(owner_user_id=user["id"])
    user_bot_ids = {b["id"] for b in user_bots}
    running = [r for r in all_running if r.get("bot_id") in user_bot_ids]
    return {"running": running, "count": len(running)}


@app.get("/api/bots/{bot_id}/export-zip")
async def export_bot_zip(bot_id: int, user: dict = Depends(get_current_user)):
    """Експорт бота як ZIP для перенесення (з перевіркою власності)."""
    import zipfile
    import io

    bot = database.get_bot(bot_id, owner_user_id=user["id"])
    if not bot:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this bot")

    bot_dir = Path(__file__).parent / "bots" / str(bot_id)
    if not bot_dir.exists():
        return JSONResponse({"error": "Bot directory not found"}, status_code=404)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for fpath in bot_dir.rglob("*"):
            if fpath.is_file() and "__pycache__" not in str(fpath) and ".pyc" not in fpath.name:
                arcname = fpath.relative_to(bot_dir)
                zf.write(fpath, arcname)

        readme = """# Telegram Bot — Exported from TG Bot Studio

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Copy .env file and set your bot token
cp .env.example .env

# 3. Run the bot
python main.py
```

## Docker

```bash
docker build -t my-bot .
docker run -d --env-file .env my-bot
```
"""
        zf.writestr("README.md", readme)

    buffer.seek(0)
    name = bot.get("name") or f"bot-{bot_id}"
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{name}-export.zip"'},
    )


@app.delete("/api/bots/{bot_id}")
async def delete_bot_endpoint(bot_id: int, user: dict = Depends(get_current_user)):
    """Видалити бота з реєстру та очистити файли (тільки якщо бот належить юзеру)."""
    bot = database.get_bot(bot_id, owner_user_id=user["id"])
    if not bot:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this bot")

    # Зупиняємо якщо запущений
    await bot_runner.stop_bot(bot_id)

    # Видаляємо з БД
    database.delete_bot(bot_id, owner_user_id=user["id"])

    # Очищуємо директорію
    bot_dir = Path(__file__).parent / "bots" / str(bot_id)
    if bot_dir.exists():
        shutil.rmtree(bot_dir, ignore_errors=True)

    return {"success": True, "deleted": bot_id}


# ─── Роздача фронтенду ─────────────────────────────────────────────

if FRONTEND_DIR.exists():
    app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
    app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")
    app.mount("/icons", StaticFiles(directory=str(FRONTEND_DIR / "icons")), name="icons")

    @app.get("/manifest.json")
    async def serve_manifest():
        return FileResponse(str(FRONTEND_DIR / "manifest.json"))

    @app.get("/sw.js")
    async def serve_sw():
        return FileResponse(str(FRONTEND_DIR / "sw.js"), media_type="application/javascript")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = FRONTEND_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))
