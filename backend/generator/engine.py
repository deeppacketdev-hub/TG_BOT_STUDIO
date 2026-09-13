"""
Ядро генератора Telegram-ботів.
Збирає конфігурацію від користувача та генерує ZIP-архів з готовим проєктом на aiogram 3.
"""

import io
import json
import zipfile
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).parent / "templates"

# Типи ботів та їх метадані
BOT_TYPES = {
    "menu": {
        "display": {"uk": "🏢 Бот-візитка / Меню", "en": "🏢 Business Card / Menu Bot", "ru": "🏢 Бот-визитка / Меню"},
        "description": {
            "uk": "Багаторівнева навігація InlineKeyboard кнопками з контактами та інформацією про компанію.",
            "en": "Multi-level InlineKeyboard button navigation with contacts and company information.",
            "ru": "Многоуровневая навигация InlineKeyboard кнопками с контактами и информацией о компании.",
        },
        "handler_template": "menu/handlers.py.j2",
    },
    "feedback": {
        "display": {"uk": "💬 Бот зворотного зв'язку", "en": "💬 Feedback Bot", "ru": "💬 Бот обратной связи"},
        "description": {
            "uk": "Користувач пише повідомлення — воно пересилається адміну. Адмін відповідає через Reply.",
            "en": "User writes a message — it is forwarded to admin. Admin responds via Reply.",
            "ru": "Пользователь пишет сообщение — оно пересылается админу. Админ отвечает через Reply.",
        },
        "handler_template": "feedback/handlers.py.j2",
    },
    "leadgen": {
        "display": {"uk": "📝 Бот збору заявок", "en": "📝 Lead Generation Bot", "ru": "📝 Бот сбора заявок"},
        "description": {
            "uk": "Покроковий опитувальник: ім'я, телефон, вибір послуги, коментар. Заявка надсилається адміну.",
            "en": "Step-by-step survey: name, phone, service selection, comment. Lead is sent to admin.",
            "ru": "Пошаговый опросник: имя, телефон, выбор услуги, комментарий. Заявка отправляется админу.",
        },
        "handler_template": "leadgen/handlers.py.j2",
    },
    "ai_assistant": {
        "display": {"uk": "🤖 AI-асистент", "en": "🤖 AI Assistant", "ru": "🤖 AI-ассистент"},
        "description": {
            "uk": "Бот з підключенням до OpenAI (ChatGPT). Відповідає на запитання з урахуванням системного промпту.",
            "en": "Bot connected to OpenAI (ChatGPT). Answers questions using a system prompt.",
            "ru": "Бот с подключением к OpenAI (ChatGPT). Отвечает на вопросы с учётом системного промпта.",
        },
        "handler_template": "ai_assistant/handlers.py.j2",
    },
    "catalog": {
        "display": {"uk": "🛍 Каталог товарів", "en": "🛍 Product Catalog", "ru": "🛍 Каталог товаров"},
        "description": {
            "uk": "Категорії, товари з описом та ціною, кошик, оформлення замовлення.",
            "en": "Categories, products with descriptions and prices, cart, order placement.",
            "ru": "Категории, товары с описанием и ценой, корзина, оформление заказа.",
        },
        "handler_template": "catalog/handlers.py.j2",
    },
    "stars_shop": {
        "display": {"uk": "⭐ Продаж за Telegram Stars", "en": "⭐ Sell for Telegram Stars", "ru": "⭐ Продажа за Telegram Stars"},
        "description": {
            "uk": "Продаж файлів та посилань за Telegram Stars (XTR). Інвойси, оплата, автовидача.",
            "en": "Sell files and links for Telegram Stars (XTR). Invoices, payments, auto-delivery.",
            "ru": "Продажа файлов и ссылок за Telegram Stars (XTR). Инвойсы, оплата, автовыдача.",
        },
        "handler_template": "stars_shop/handlers.py.j2",
    },
}

# Базові шаблони, спільні для всіх типів
BASE_TEMPLATES = [
    ("main.py", "base/main.py.j2"),
    ("config.py", "base/config.py.j2"),
    ("requirements.txt", "base/requirements.txt.j2"),
    (".env.example", "base/env.example.j2"),
    ("Dockerfile", "base/Dockerfile.j2"),
    ("README.md", "base/README.md.j2"),
]


def _get_jinja_env() -> Environment:
    """Створити та повернути Jinja2 Environment з каталогом шаблонів."""
    return Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(disabled_extensions=("j2",)),
        keep_trailing_newline=True,
    )


def _get_default_config(bot_type: str, lang: str = "uk") -> dict:
    """Повернути мінімальну конфігурацію за замовчуванням для типу бота (з урахуванням мови)."""
    defaults_i18n: dict = {
        "menu": {
            "uk": {
                "menu_items": [
                    {"id": "about", "label": "ℹ️ Про нас", "text": "Ми — сучасна компанія, що надає якісні послуги."},
                    {"id": "services", "label": "🔧 Послуги", "text": "Наші послуги:\n• Консультації\n• Розробка\n• Підтримка"},
                    {"id": "contacts", "label": "📞 Контакти", "text": "📞 +380XXXXXXXXX\n📧 info@example.com\n📍 Київ, Україна"},
                ],
                "welcome_text": "👋 Вітаємо! Оберіть розділ:",
            },
            "en": {
                "menu_items": [
                    {"id": "about", "label": "ℹ️ About Us", "text": "We are a modern company providing quality services."},
                    {"id": "services", "label": "🔧 Services", "text": "Our services:\n• Consulting\n• Development\n• Support"},
                    {"id": "contacts", "label": "📞 Contacts", "text": "📞 +1XXXXXXXXX\n📧 info@example.com\n📍 New York, USA"},
                ],
                "welcome_text": "👋 Welcome! Choose a section:",
            },
            "ru": {
                "menu_items": [
                    {"id": "about", "label": "ℹ️ О нас", "text": "Мы — современная компания, предоставляющая качественные услуги."},
                    {"id": "services", "label": "🔧 Услуги", "text": "Наши услуги:\n• Консультации\n• Разработка\n• Поддержка"},
                    {"id": "contacts", "label": "📞 Контакты", "text": "📞 +7XXXXXXXXX\n📧 info@example.com\n📍 Москва, Россия"},
                ],
                "welcome_text": "👋 Добро пожаловать! Выберите раздел:",
            },
        },
        "feedback": {
            "uk": {"welcome_text": "👋 Вітаємо!\\n\\nНапишіть ваше повідомлення, і ми обов'язково відповімо."},
            "en": {"welcome_text": "👋 Welcome!\\n\\nWrite your message and we will definitely respond."},
            "ru": {"welcome_text": "👋 Приветствуем!\\n\\nНапишите ваше сообщение, и мы обязательно ответим."},
        },
        "leadgen": {
            "uk": {
                "welcome_text": "👋 Вітаємо!\\n\\nЗалиште заявку, і ми зв'яжемося з вами.",
                "thank_you_text": "✅ Дякуємо! Вашу заявку прийнято.",
                "form_fields": ["name", "phone", "comment"],
                "services": ["Консультація", "Розробка сайту", "Дизайн", "Інше"],
            },
            "en": {
                "welcome_text": "👋 Welcome!\\n\\nLeave a request and we will contact you.",
                "thank_you_text": "✅ Thank you! Your request has been received.",
                "form_fields": ["name", "phone", "comment"],
                "services": ["Consultation", "Website Development", "Design", "Other"],
            },
            "ru": {
                "welcome_text": "👋 Приветствуем!\\n\\nОставьте заявку, и мы свяжемся с вами.",
                "thank_you_text": "✅ Спасибо! Ваша заявка принята.",
                "form_fields": ["name", "phone", "comment"],
                "services": ["Консультация", "Разработка сайта", "Дизайн", "Другое"],
            },
        },
        "ai_assistant": {
            "uk": {
                "welcome_text": "🤖 Вітаю! Я AI-асистент.\\n\\nЗадайте мені будь-яке питання!",
                "ai_system_prompt": "Ти — корисний AI-асистент. Відповідай українською мовою.",
                "ai_model": "gpt-4o-mini",
            },
            "en": {
                "welcome_text": "🤖 Hello! I'm an AI assistant.\\n\\nAsk me anything!",
                "ai_system_prompt": "You are a helpful AI assistant. Answer in English.",
                "ai_model": "gpt-4o-mini",
            },
            "ru": {
                "welcome_text": "🤖 Привет! Я AI-ассистент.\\n\\nЗадайте мне любой вопрос!",
                "ai_system_prompt": "Ты — полезный AI-ассистент. Отвечай на русском языке.",
                "ai_model": "gpt-4o-mini",
            },
        },
        "catalog": {
            "uk": {
                "welcome_text": "🛍 Вітаємо в нашому магазині!\\n\\nОберіть категорію:",
                "catalog": [
                    {"id": "cat1", "name": "Електроніка", "emoji": "📱", "products": [
                        {"id": "p1", "name": "Навушники", "price": 1200, "description": "Бездротові навушники з шумозаглушенням."},
                        {"id": "p2", "name": "Повербанк", "price": 800, "description": "20000 mAh, швидка зарядка."},
                    ]},
                    {"id": "cat2", "name": "Аксесуари", "emoji": "🎒", "products": [
                        {"id": "p3", "name": "Чохол", "price": 350, "description": "Силіконовий чохол для iPhone."},
                        {"id": "p4", "name": "Кабель USB-C", "price": 200, "description": "Кабель 1.5м, нейлонова оплетка."},
                    ]},
                ],
            },
            "en": {
                "welcome_text": "🛍 Welcome to our store!\\n\\nChoose a category:",
                "catalog": [
                    {"id": "cat1", "name": "Electronics", "emoji": "📱", "products": [
                        {"id": "p1", "name": "Headphones", "price": 30, "description": "Wireless headphones with noise cancellation."},
                        {"id": "p2", "name": "Power Bank", "price": 20, "description": "20000 mAh, fast charging."},
                    ]},
                    {"id": "cat2", "name": "Accessories", "emoji": "🎒", "products": [
                        {"id": "p3", "name": "Phone Case", "price": 9, "description": "Silicone case for iPhone."},
                        {"id": "p4", "name": "USB-C Cable", "price": 5, "description": "1.5m cable, nylon braided."},
                    ]},
                ],
            },
            "ru": {
                "welcome_text": "🛍 Добро пожаловать в наш магазин!\\n\\nВыберите категорию:",
                "catalog": [
                    {"id": "cat1", "name": "Электроника", "emoji": "📱", "products": [
                        {"id": "p1", "name": "Наушники", "price": 1200, "description": "Беспроводные наушники с шумоподавлением."},
                        {"id": "p2", "name": "Повербанк", "price": 800, "description": "20000 mAh, быстрая зарядка."},
                    ]},
                    {"id": "cat2", "name": "Аксессуары", "emoji": "🎒", "products": [
                        {"id": "p3", "name": "Чехол", "price": 350, "description": "Силиконовый чехол для iPhone."},
                        {"id": "p4", "name": "Кабель USB-C", "price": 200, "description": "Кабель 1.5м, нейлоновая оплетка."},
                    ]},
                ],
            },
        },
        "stars_shop": {
            "uk": {
                "welcome_text": "⭐ Вітаємо в магазині цифрових товарів!\\n\\nОберіть товар для покупки за Telegram Stars:",
                "products": [
                    {"id": "item1", "title": "📘 Електронна книга", "description": "Повний гайд з програмування на Python", "price": 50, "type": "file", "content": "ebook.pdf"},
                    {"id": "item2", "title": "🔗 VIP-канал", "description": "Доступ до закритого Telegram-каналу", "price": 100, "type": "link", "content": "https://t.me/+SECRET_INVITE_LINK"},
                    {"id": "item3", "title": "📦 Шаблон бота", "description": "Готовий шаблон Telegram-бота для бізнесу", "price": 75, "type": "file", "content": "bot_template.zip"},
                ],
            },
            "en": {
                "welcome_text": "⭐ Welcome to the digital store!\\n\\nChoose a product to buy with Telegram Stars:",
                "products": [
                    {"id": "item1", "title": "📘 E-Book", "description": "Complete Python programming guide", "price": 50, "type": "file", "content": "ebook.pdf"},
                    {"id": "item2", "title": "🔗 VIP Channel", "description": "Access to private Telegram channel", "price": 100, "type": "link", "content": "https://t.me/+SECRET_INVITE_LINK"},
                    {"id": "item3", "title": "📦 Bot Template", "description": "Ready-made Telegram bot template for business", "price": 75, "type": "file", "content": "bot_template.zip"},
                ],
            },
            "ru": {
                "welcome_text": "⭐ Добро пожаловать в магазин цифровых товаров!\\n\\nВыберите товар для покупки за Telegram Stars:",
                "products": [
                    {"id": "item1", "title": "📘 Электронная книга", "description": "Полный гайд по программированию на Python", "price": 50, "type": "file", "content": "ebook.pdf"},
                    {"id": "item2", "title": "🔗 VIP-канал", "description": "Доступ к закрытому Telegram-каналу", "price": 100, "type": "link", "content": "https://t.me/+SECRET_INVITE_LINK"},
                    {"id": "item3", "title": "📦 Шаблон бота", "description": "Готовый шаблон Telegram-бота для бизнеса", "price": 75, "type": "file", "content": "bot_template.zip"},
                ],
            },
        },
    }
    bot_defaults = defaults_i18n.get(bot_type, {})
    return bot_defaults.get(lang, bot_defaults.get("uk", {}))


def generate_bot_zip(config: dict) -> io.BytesIO:
    """
    Згенерувати ZIP-архів з готовим проєктом бота.

    Args:
        config: Конфігурація бота від користувача. Обов'язкові поля:
            - bot_type: str — один з ключів BOT_TYPES
            - bot_token: str — токен від BotFather (необов'язково, підставиться placeholder)
            - bot_name: str — назва бота / проєкту
            + інші поля залежно від типу бота

    Returns:
        io.BytesIO — готовий ZIP-архів в пам'яті
    """
    bot_type = config.get("bot_type", "menu")
    bot_name = config.get("bot_name", "my-telegram-bot")

    if bot_type not in BOT_TYPES:
        raise ValueError(f"Невідомий тип бота: {bot_type}. Доступні: {list(BOT_TYPES.keys())}")

    bot_meta = BOT_TYPES[bot_type]
    lang = config.get("lang", "uk")

    # Зливаємо дефолтну конфігурацію з користувацькою (з урахуванням мови)
    default_cfg = _get_default_config(bot_type, lang)
    merged = {**default_cfg, **config}
    merged["bot_type"] = bot_type
    # Вибираємо локалізований display/description
    display = bot_meta["display"]
    desc = bot_meta["description"]
    merged["bot_type_display"] = display.get(lang, display.get("uk", "")) if isinstance(display, dict) else display
    merged["bot_description"] = desc.get(lang, desc.get("uk", "")) if isinstance(desc, dict) else desc

    env = _get_jinja_env()
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. Генеруємо базові файли
        for filename, template_path in BASE_TEMPLATES:
            template = env.get_template(template_path)
            content = template.render(**merged)
            zf.writestr(f"{bot_name}/{filename}", content)

        # 2. Генеруємо handlers.py для обраного типу бота
        handler_template = env.get_template(bot_meta["handler_template"])
        handler_content = handler_template.render(**merged)
        zf.writestr(f"{bot_name}/handlers.py", handler_content)

    buffer.seek(0)
    return buffer


def get_bot_types_info(lang: str = "uk") -> list[dict]:
    """Повернути список доступних типів ботів для фронтенду (з урахуванням мови)."""
    result = []
    for key, meta in BOT_TYPES.items():
        display = meta["display"]
        desc = meta["description"]
        result.append({
            "id": key,
            "display": display.get(lang, display.get("uk", "")) if isinstance(display, dict) else display,
            "description": desc.get(lang, desc.get("uk", "")) if isinstance(desc, dict) else desc,
        })
    return result
