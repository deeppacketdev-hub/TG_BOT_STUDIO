"""
TG Bot Builder — FastAPI Backend.
API для генерації Telegram-ботів, валідації токенів та обслуговування фронтенду.
"""

import hashlib
import hmac
import time
import uuid
from pathlib import Path

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from generator.engine import generate_bot_zip, get_bot_types_info
from database import init_db, add_bot, get_all_bots, get_bot, delete_bot, get_analytics_summary, add_stars_transaction, update_bot_username
import bot_runner

# ─── Конфігурація ───────────────────────────────────────────────────
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

app = FastAPI(
    title="TG Bot Builder",
    description="Конструктор Telegram-ботів — генерація готових проєктів на aiogram 3",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Ініціалізація бази даних ────────────────────────────────────────
@app.on_event("startup")
async def startup():
    init_db()

# ─── In-memory сховище замовлень (для демо) ─────────────────────────
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
    amount: int = 299  # Ціна в грн


class VerifyPayment(BaseModel):
    order_id: str
    payment_status: str = "success"  # Для тестового режиму


# ─── API Ендпоінти ──────────────────────────────────────────────────


@app.get("/api/bot-types")
async def list_bot_types(lang: str = "uk"):
    """Повернути список доступних типів ботів з описами (з урахуванням мови)."""
    return {"types": get_bot_types_info(lang)}


@app.post("/api/validate-token")
async def validate_token(data: TokenValidation):
    """Перевірити валідність Telegram Bot токена через API."""
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

    # Тестовий режим: приймаємо оплату
    order["status"] = "paid"
    return {
        "verified": True,
        "order_id": data.order_id,
        "message": "✅ Оплату підтверджено! Тепер ви можете завантажити бота.",
    }


@app.post("/api/generate-bot")
async def generate_bot(config: BotConfig):
    """Згенерувати ZIP-архів з готовим проєктом бота."""
    try:
        # Перетворюємо Pydantic модель у dict, прибираючи порожні значення
        cfg = {k: v for k, v in config.model_dump().items() if v or isinstance(v, (int, float, bool))}
        zip_buffer = generate_bot_zip(cfg)

        # Auto-save bot to database
        try:
            bot_id = add_bot(
                name=config.bot_name,
                bot_type=config.bot_type,
                token=config.bot_token,
                lang=config.lang,
            )
        except Exception:
            bot_id = None  # Don't fail generation if DB write fails

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


# ─── Analytics API ──────────────────────────────────────────────────


class SyncStarsRequest(BaseModel):
    bot_id: int
    amount: int
    item_title: str = "Test Item"
    user_tg_id: str = "123456789"


@app.get("/api/analytics/summary")
async def analytics_summary():
    """Загальна аналітика: сума Stars, кількість ботів, транзакцій."""
    return get_analytics_summary()


@app.get("/api/bots")
async def list_bots():
    """Реєстр усіх створених ботів."""
    bots = get_all_bots()
    return {"bots": bots, "total": len(bots)}


@app.post("/api/bots/sync-stars")
async def sync_stars(data: SyncStarsRequest):
    """Додати тестову транзакцію Stars для бота."""
    bot = get_bot(data.bot_id)
    if not bot:
        return JSONResponse(status_code=404, content={"error": "Bot not found"})

    add_stars_transaction(
        bot_id=data.bot_id,
        amount=data.amount,
        user_tg_id=data.user_tg_id,
        item_title=data.item_title,
    )
    updated = get_bot(data.bot_id)
    return {
        "success": True,
        "bot_id": data.bot_id,
        "new_total": updated["total_stars_earned"] if updated else 0,
    }


@app.delete("/api/bots/{bot_id}")
async def remove_bot(bot_id: int):
    """Видалити бота з реєстру."""
    bot = get_bot(bot_id)
    if not bot:
        return JSONResponse(status_code=404, content={"error": "Bot not found"})
    delete_bot(bot_id)
    return {"success": True, "deleted_id": bot_id}


# ─── Bot Runner API ─────────────────────────────────────────────────


@app.post("/api/deploy-bot")
async def deploy_bot_endpoint(config: BotConfig):
    """Згенерувати, зберегти на диск, встановити залежності та запустити бота."""
    try:
        cfg = {k: v for k, v in config.model_dump().items() if v or isinstance(v, (int, float, bool))}
        zip_buffer = generate_bot_zip(cfg)

        # Save to DB
        bot_id = add_bot(
            name=config.bot_name,
            bot_type=config.bot_type,
            token=config.bot_token,
            lang=config.lang,
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


@app.post("/api/bots/{bot_id}/start")
async def start_bot_endpoint(bot_id: int):
    """Запустити бота."""
    bot = get_bot(bot_id)
    if not bot:
        return JSONResponse(status_code=404, content={"error": "Bot not found"})

    if not bot_runner.is_deployed(bot_id):
        return JSONResponse(status_code=400, content={"error": "Bot is not deployed. Re-deploy first."})

    result = await bot_runner.start_bot(bot_id)
    return result


@app.post("/api/bots/{bot_id}/stop")
async def stop_bot_endpoint(bot_id: int):
    """Зупинити бота."""
    result = await bot_runner.stop_bot(bot_id)
    return result


@app.get("/api/bots/{bot_id}/status")
async def bot_status_endpoint(bot_id: int):
    """Отримати статус бота."""
    return bot_runner.get_bot_status(bot_id)


@app.get("/api/bots/running")
async def running_bots_endpoint():
    """Список запущених ботів."""
    running = bot_runner.get_all_running()
    return {"running": running, "count": len(running)}


@app.get("/api/bots/{bot_id}/export-zip")
async def export_bot_zip(bot_id: int):
    """Export a deployed bot as ZIP for transfer to another server."""
    import zipfile
    import io

    bot_dir = Path(__file__).parent / "bots" / str(bot_id)
    if not bot_dir.exists():
        return JSONResponse({"error": "Bot directory not found"}, status_code=404)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for fpath in bot_dir.rglob("*"):
            if fpath.is_file() and "__pycache__" not in str(fpath) and ".pyc" not in fpath.name:
                arcname = fpath.relative_to(bot_dir)
                zf.write(fpath, arcname)

        # Add README with instructions
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
    bot = get_bot(bot_id)
    name = bot["name"] if bot else f"bot-{bot_id}"
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{name}-export.zip"'},
    )


@app.delete("/api/bots/{bot_id}")
async def delete_bot_endpoint(bot_id: int):
    """Delete a bot from the registry and clean up files."""
    import shutil

    # Stop if running
    await bot_runner.stop_bot(bot_id)

    # Remove from database
    delete_bot(bot_id)

    # Remove deployed files
    bot_dir = Path(__file__).parent / "bots" / str(bot_id)
    if bot_dir.exists():
        shutil.rmtree(bot_dir, ignore_errors=True)

    return {"success": True, "deleted": bot_id}


# ─── Роздача фронтенду ─────────────────────────────────────────────

# Статичні файли (CSS, JS, icons)
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

    # SPA fallback — всі інші маршрути віддають index.html
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = FRONTEND_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))
