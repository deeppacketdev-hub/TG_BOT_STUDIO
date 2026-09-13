"""
TG Bot Builder — Bot Runner Module.
Manages bot processes: deploy, start, stop, status.
Stores generated bot code on disk and runs them as subprocesses.
"""

import asyncio
import os
import signal
import sys
import time
import zipfile
from io import BytesIO
from pathlib import Path

from database import update_bot_username, set_bot_status

# ─── Configuration ───────────────────────────────────────────────────
BOTS_DIR = Path(__file__).parent / "bots"

# Track running processes: bot_id -> { process, pid, started_at }
_running: dict[int, dict] = {}


def _ensure_bots_dir():
    BOTS_DIR.mkdir(parents=True, exist_ok=True)


def get_bot_dir(bot_id: int) -> Path:
    """Get the directory for a specific bot."""
    return BOTS_DIR / str(bot_id)


def deploy_bot(bot_id: int, zip_buffer: BytesIO) -> dict:
    """
    Extract bot ZIP to disk and install requirements.
    Returns deployment info.
    """
    _ensure_bots_dir()
    bot_dir = get_bot_dir(bot_id)

    # Clean previous deployment
    if bot_dir.exists():
        import shutil
        shutil.rmtree(bot_dir)

    bot_dir.mkdir(parents=True)

    # Extract ZIP
    zip_buffer.seek(0)
    with zipfile.ZipFile(zip_buffer, 'r') as zf:
        # ZIP contains a top-level folder, we need to flatten
        members = zf.namelist()
        # Find the common prefix (top-level dir)
        prefix = ""
        if members and '/' in members[0]:
            prefix = members[0].split('/')[0] + '/'

        for member in members:
            if member.endswith('/'):
                # Directory
                rel = member[len(prefix):] if prefix else member
                if rel:
                    (bot_dir / rel).mkdir(parents=True, exist_ok=True)
            else:
                # File
                rel = member[len(prefix):] if prefix else member
                if rel:
                    target = bot_dir / rel
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(zf.read(member))

    # Install requirements if requirements.txt exists
    req_file = bot_dir / "requirements.txt"
    install_log = ""
    if req_file.exists():
        import subprocess
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", "-r", str(req_file), "--quiet"],
                capture_output=True,
                text=True,
                timeout=120,
            )
            install_log = result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            install_log = "pip install timed out (120s)"
        except Exception as e:
            install_log = f"pip install error: {str(e)}"

    # List deployed files
    files = [str(f.relative_to(bot_dir)) for f in bot_dir.rglob("*") if f.is_file()]

    return {
        "bot_id": bot_id,
        "path": str(bot_dir),
        "files": files,
        "install_log": install_log,
    }


async def start_bot(bot_id: int) -> dict:
    """Start a bot process."""
    if bot_id in _running:
        return {"error": "Bot is already running", "status": "ONLINE"}

    bot_dir = get_bot_dir(bot_id)
    main_py = bot_dir / "main.py"

    if not main_py.exists():
        # Try bot.py as alternative
        main_py = bot_dir / "bot.py"
        if not main_py.exists():
            return {"error": "No main.py or bot.py found in deployment"}

    # Check .env exists
    env_file = bot_dir / ".env"
    env_example = bot_dir / ".env.example"
    if not env_file.exists() and env_example.exists():
        # Copy .env.example to .env
        env_file.write_text(env_example.read_text())

    try:
        process = await asyncio.create_subprocess_exec(
            sys.executable, str(main_py),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(bot_dir),
        )

        _running[bot_id] = {
            "process": process,
            "pid": process.pid,
            "started_at": time.time(),
        }

        set_bot_status(bot_id, "ONLINE")

        # Start background task to collect output
        asyncio.create_task(_monitor_process(bot_id, process))

        return {
            "success": True,
            "bot_id": bot_id,
            "pid": process.pid,
            "status": "ONLINE",
        }

    except Exception as e:
        return {"error": f"Failed to start: {str(e)}"}


async def stop_bot(bot_id: int) -> dict:
    """Stop a running bot process."""
    info = _running.get(bot_id)
    if not info:
        return {"error": "Bot is not running", "status": "STANDBY"}

    process = info["process"]
    try:
        process.terminate()
        try:
            await asyncio.wait_for(process.wait(), timeout=5)
        except asyncio.TimeoutError:
            process.kill()
    except ProcessLookupError:
        pass

    _running.pop(bot_id, None)
    set_bot_status(bot_id, "STANDBY")

    return {
        "success": True,
        "bot_id": bot_id,
        "status": "STANDBY",
    }


def get_bot_status(bot_id: int) -> dict:
    """Get the running status of a bot."""
    info = _running.get(bot_id)
    if not info:
        return {"bot_id": bot_id, "status": "STANDBY", "pid": None}

    process = info["process"]
    if process.returncode is not None:
        # Process has exited
        _running.pop(bot_id, None)
        set_bot_status(bot_id, "STANDBY")
        return {"bot_id": bot_id, "status": "STANDBY", "pid": None, "exit_code": process.returncode}

    uptime = int(time.time() - info["started_at"])
    return {
        "bot_id": bot_id,
        "status": "ONLINE",
        "pid": info["pid"],
        "uptime_seconds": uptime,
    }


def get_all_running() -> list[int]:
    """Return list of running bot IDs."""
    return list(_running.keys())


async def _monitor_process(bot_id: int, process):
    """Monitor a bot process and update status when it exits."""
    try:
        await process.wait()
    except Exception:
        pass
    finally:
        _running.pop(bot_id, None)
        try:
            set_bot_status(bot_id, "STANDBY")
        except Exception:
            pass


def get_bot_logs(bot_id: int, lines: int = 50) -> str:
    """Read the last N lines of bot output (if captured)."""
    log_file = get_bot_dir(bot_id) / "bot.log"
    if not log_file.exists():
        return ""
    try:
        content = log_file.read_text(errors='replace')
        return "\n".join(content.splitlines()[-lines:])
    except Exception:
        return ""


def is_deployed(bot_id: int) -> bool:
    """Check if a bot has been deployed to disk."""
    bot_dir = get_bot_dir(bot_id)
    return bot_dir.exists() and any(bot_dir.iterdir())
