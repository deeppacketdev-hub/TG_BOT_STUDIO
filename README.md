# 🤖 TG_BOT_STUDIO // CONSOLE v2.0

> **Next-Generation Telegram Bot Visual Builder & Deployment Platform**  
> Visual builder, live interactive Telegram device simulator, multi-currency monetization (Telegram Stars + TON Crypto), zero-config local daemon runner, and one-click self-hosted VPS export.

---

## ⚡ Features

- 🎨 **Visual Builder & Live macOS Simulator**: Real-time reactive preview of telegram keyboards, messages, and checkout flows as you configure your bot.
- 🛍️ **6 Ready-to-Deploy Bot Templates**:
  - **E-Commerce & Stars Shop**: Digital/physical store with **Telegram Stars** invoice checkout and **TON Crypto Wallet** direct payments.
  - **AI Assistant**: OpenAI GPT-powered conversational bot with system prompt tuning.
  - **Digital Catalog**: Categorized product showcase with rich media and direct ordering.
  - **Lead Generation**: Customer qualification and contact collection with instant admin alerts.
  - **Interactive Menu**: Multi-level menu for restaurants and services with prices.
  - **Support & Feedback**: Customer ticketing and review routing directly to your admin chat.
- 🚀 **Dual Deployment Engine**:
  - **Local Host Daemon**: Run your bot directly on your machine with a single click. Includes real-time status telemetry, heartbeat pinging, and integrated logs drawer.
  - **Standalone VPS/Server Package**: Export self-contained ZIP packages with auto-generated `start.sh`, `start.bat`, dependencies, and `systemd` service configs.
  - **Seamless Hot-Migration**: Switch from local execution to standalone server export anytime with zero data loss.
- 🌐 **Full Multi-Language Support**: Fully localized in **Ukrainian (UK)**, **English (EN)**, and **Russian (RU)**.
- 📊 **Analytics & Telemetry Hub**: Comprehensive statistics dashboard tracking active instances, orders, revenues (Stars ⭐ & TON 💎), and user interactions.

---

## 📁 Architecture & Tech Stack

```
tg-bot-builder/
├── backend/
│   ├── generator/           # Jinja2 bot code generators & templates
│   │   ├── templates/       # 6 template types (stars_shop, ai_assistant, catalog, etc.)
│   │   └── engine.py        # Code compilation & zip generation engine
│   ├── bots/                # Generated & active bot instances (git-ignored)
│   ├── data/                # SQLite storage (bot configurations & analytics)
│   ├── bot_runner.py        # Subprocess manager & process supervisor
│   ├── database.py          # Async/sync database layer
│   ├── main.py              # FastAPI application & REST endpoints
│   ├── requirements.txt     # Backend dependencies
│   └── .env.example         # Environment template
├── frontend/
│   ├── css/
│   │   └── style.css        # Premium Cyberpunk / Glassmorphism HUD Design
│   ├── js/
│   │   ├── app.js           # Core state & routing
│   │   ├── wizard.js        # Step-by-step bot builder wizard
│   │   ├── simulator.js     # Live interactive Telegram UI simulator
│   │   ├── instances.js     # Active bots management & hot-migration
│   │   ├── analytics.js     # Telemetry & revenue metrics
│   │   └── i18n.js          # Internationalization engine (uk / en / ru)
│   ├── icons/               # PWA icons
│   ├── index.html           # Main SPA interface
│   ├── manifest.json        # Web App Manifest
│   └── sw.js                # Service Worker
├── DEVELOPMENT_PLAN.md      # Detailed architectural & milestone roadmap
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### 1. Requirements
- **Python 3.10+**
- **pip**
- (Optional) Modern web browser (Chrome, Safari, Edge)

### 2. Installation

Clone the repository:
```bash
git clone https://github.com/deeppacketdev-hub/TG_BOT_STUDIO.git
cd TG_BOT_STUDIO
```

Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### 3. Launch Studio

Start the development server:
```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

Open your browser and navigate to:
```
http://localhost:8080
```

---

## 🛠️ Deployment Modes

### Mode A: Run Directly on Your Machine
1. Create and configure your bot in the 4-step wizard.
2. Under **Step 3 (Deployment Options)**, choose **"Run on This Device"**.
3. The studio automatically creates the bot environment, installs dependencies, and launches the bot process.
4. Monitor logs in real time via the **Console Logs Drawer** and manage instances under **"Active Bots"**.

### Mode B: Export Standalone ZIP for Remote VPS
1. Under **Step 3**, choose **"Export ZIP Package"**.
2. Click **Download ZIP** on Step 4.
3. Transfer the ZIP file to your VPS or cloud server:
   ```bash
   unzip bot_<id>.zip
   cd bot_<id>
   chmod +x start.sh
   ./start.sh
   ```

---

## 📜 License
MIT License. Created by [Deep Packet](https://github.com/deeppacketdev-hub).
