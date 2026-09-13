/**
 * TG_BOT_STUDIO // i18n Module
 * Full trilingual support: Ukrainian (uk), English (en), Russian (ru)
 * Covers: navigation, bot types, config forms, simulator, analytics, system messages.
 */

const I18n = (() => {
    let _currentLang = localStorage.getItem('tg_console_lang') || 'uk';

    // ═══════════════════════════════════════════════════════════════
    //  DICTIONARY
    // ═══════════════════════════════════════════════════════════════
    const DICT = {
        // ─── Navigation & Header ─────────────────────────────────
        'nav.builder': { uk: 'BUILDER_ENGINE', en: 'BUILDER_ENGINE', ru: 'BUILDER_ENGINE' },
        'nav.analytics': { uk: 'ANALYTICS_HUB', en: 'ANALYTICS_HUB', ru: 'ANALYTICS_HUB' },
        'nav.instances': { uk: 'ACTIVE_INSTANCES', en: 'ACTIVE_INSTANCES', ru: 'ACTIVE_INSTANCES' },

        // ─── Step 0: Choose Bot Type ─────────────────────────────
        'step0.title': { uk: 'Оберіть тип бота', en: 'Choose Bot Type', ru: 'Выберите тип бота' },
        'step0.subtitle': { uk: 'Що має робити ваш Telegram-бот?', en: 'What should your Telegram bot do?', ru: 'Что должен делать ваш Telegram-бот?' },

        // ─── Step 1: Configure ───────────────────────────────────
        'step1.back': { uk: '← cd ..', en: '← cd ..', ru: '← cd ..' },
        'step1.next': { uk: 'ДАЛІ → ПЕРЕГЛЯД', en: 'NEXT → PREVIEW', ru: 'ДАЛЕЕ → ПРЕДПРОСМОТР' },
        'step1.defaultBotName': { uk: 'Мій Бот', en: 'My Bot', ru: 'Мой Бот' },
        'step1.simOnline': { uk: 'онлайн', en: 'online', ru: 'онлайн' },
        'step1.msgPlaceholder': { uk: 'Повідомлення...', en: 'Message...', ru: 'Сообщение...' },

        // ─── Step 2: Payment ─────────────────────────────────────
        'step2.back': { uk: '← cd ..', en: '← cd ..', ru: '← cd ..' },
        'step2.title': { uk: 'Оплата', en: 'Payment', ru: 'Оплата' },
        'step2.subtitle': { uk: 'Оплатіть, щоб завантажити готовий проєкт', en: 'Pay to download the ready project', ru: 'Оплатите, чтобы скачать готовый проект' },
        'step2.priceOld': { uk: '599 грн', en: '$15', ru: '599 грн' },
        'step2.priceCurrent': { uk: '299 грн', en: '$7.50', ru: '299 грн' },
        'step2.feature1': { uk: '✅ Повний вихідний код (Python / aiogram 3)', en: '✅ Full source code (Python / aiogram 3)', ru: '✅ Полный исходный код (Python / aiogram 3)' },
        'step2.feature2': { uk: '✅ Dockerfile для деплою за 1 хвилину', en: '✅ Dockerfile for 1-minute deploy', ru: '✅ Dockerfile для деплоя за 1 минуту' },
        'step2.feature3': { uk: '✅ Покрокова інструкція запуску', en: '✅ Step-by-step launch guide', ru: '✅ Пошаговая инструкция запуска' },
        'step2.feature4': { uk: '✅ Необмежене використання', en: '✅ Unlimited usage', ru: '✅ Неограниченное использование' },
        'step2.feature5': { uk: '✅ Без підписок та прихованих платежів', en: '✅ No subscriptions or hidden fees', ru: '✅ Без подписок и скрытых платежей' },
        'step2.payBtn': { uk: 'ОПЛАТИТИ 299 ГРН', en: 'PAY $7.50', ru: 'ОПЛАТИТЬ 299 ГРН' },
        'step2.payNote': { uk: '🔒 Безпечна оплата. Тестовий режим: оплата симулюється автоматично.', en: '🔒 Secure payment. Test mode: payment is simulated automatically.', ru: '🔒 Безопасная оплата. Тестовый режим: оплата симулируется автоматически.' },

        // ─── Step 3: Download ────────────────────────────────────
        'step3.title': { uk: 'Бот готовий! 🎉', en: 'Bot is Ready! 🎉', ru: 'Бот готов! 🎉' },
        'step3.subtitle': { uk: 'Завантажте архів та запустіть бота за 1 хвилину', en: 'Download the archive and launch the bot in 1 minute', ru: 'Скачайте архив и запустите бота за 1 минуту' },
        'step3.downloadBtn': { uk: 'ЗАВАНТАЖИТИ .ZIP', en: 'DOWNLOAD .ZIP', ru: 'СКАЧАТЬ .ZIP' },
        'step3.quickStart': { uk: '🚀 Швидкий старт:', en: '🚀 Quick Start:', ru: '🚀 Быстрый старт:' },
        'step3.code1': { uk: '# 1. Розпакуйте архів та перейдіть в папку', en: '# 1. Unpack the archive and navigate to the folder', ru: '# 1. Распакуйте архив и перейдите в папку' },
        'step3.code2': { uk: '# 2. Встановіть залежності', en: '# 2. Install dependencies', ru: '# 2. Установите зависимости' },
        'step3.code3': { uk: '# 3. Скопіюйте .env та вставте токен', en: '# 3. Copy .env and paste your token', ru: '# 3. Скопируйте .env и вставьте токен' },
        'step3.code4': { uk: '# 4. Запустіть!', en: '# 4. Launch!', ru: '# 4. Запустите!' },
        'step3.createAnother': { uk: '➕ СТВОРИТИ ЩЕ ОДНОГО БОТА', en: '➕ CREATE ANOTHER BOT', ru: '➕ СОЗДАТЬ ЕЩЁ ОДНОГО БОТА' },

        // ─── Analytics Dashboard ─────────────────────────────────
        'analytics.title': { uk: 'ANALYTICS_HUB', en: 'ANALYTICS_HUB', ru: 'ANALYTICS_HUB' },
        'analytics.text': { uk: 'Модуль аналітики буде доступний після активації.', en: 'Analytics module will be available after activation.', ru: 'Модуль аналитики будет доступен после активации.' },
        'analytics.refresh': { uk: 'Оновити дані', en: 'Refresh data', ru: 'Обновить данные' },
        'analytics.noBots': { uk: 'Ще немає створених ботів', en: 'No bots created yet', ru: 'Пока нет созданных ботов' },
        'analytics.noBotsHint': { uk: 'Створіть бота в конструкторі — він з\'явиться тут автоматично.', en: 'Create a bot in the builder — it will appear here automatically.', ru: 'Создайте бота в конструкторе — он появится здесь автоматически.' },
        'analytics.colName': { uk: 'НАЗВА / ТИП', en: 'NAME / TYPE', ru: 'НАЗВАНИЕ / ТИП' },
        'analytics.colLink': { uk: 'ПОСИЛАННЯ', en: 'LINK', ru: 'ССЫЛКА' },
        'analytics.colStatus': { uk: 'СТАТУС', en: 'STATUS', ru: 'СТАТУС' },
        'analytics.colDate': { uk: 'ДАТА', en: 'DATE', ru: 'ДАТА' },
        'analytics.colActions': { uk: 'ДІЇ', en: 'ACTIONS', ru: 'ДЕЙСТВИЯ' },
        'analytics.syncStars': { uk: 'Симулювати продаж ⭐', en: 'Simulate sale ⭐', ru: 'Симулировать продажу ⭐' },
        'analytics.delete': { uk: 'Видалити', en: 'Delete', ru: 'Удалить' },
        'instances.title': { uk: 'ACTIVE_INSTANCES // COMING_SOON', en: 'ACTIVE_INSTANCES // COMING_SOON', ru: 'ACTIVE_INSTANCES // COMING_SOON' },
        'instances.text': { uk: 'Реєстр створених ботів. Посилання t.me/..., статуси та швидкі дії з\'являться тут.', en: 'Registry of created bots. Links t.me/..., statuses and quick actions will appear here.', ru: 'Реестр созданных ботов. Ссылки t.me/..., статусы и быстрые действия появятся здесь.' },

        // ─── Toast & Loading Messages ────────────────────────────
        'toast.paymentConfirmed': { uk: 'Оплату підтверджено!', en: 'Payment confirmed!', ru: 'Оплата подтверждена!' },
        'toast.paymentError': { uk: 'Помилка оплати. Спробуйте ще раз.', en: 'Payment error. Try again.', ru: 'Ошибка оплаты. Попробуйте снова.' },
        'toast.downloadSuccess': { uk: 'Архів завантажено! 🎉', en: 'Archive downloaded! 🎉', ru: 'Архив скачан! 🎉' },
        'toast.error': { uk: 'Помилка', en: 'Error', ru: 'Ошибка' },
        'toast.genError': { uk: 'Помилка генерації', en: 'Generation error', ru: 'Ошибка генерации' },
        'loading.generating': { uk: 'Генеруємо вашого бота...', en: 'Generating your bot...', ru: 'Генерируем вашего бота...' },
        'loading.processing': { uk: 'Обробка оплати...', en: 'Processing payment...', ru: 'Обработка оплаты...' },
        'loading.default': { uk: 'Завантаження...', en: 'Loading...', ru: 'Загрузка...' },

        // ─── Token Validation ────────────────────────────────────
        'token.checking': { uk: '⏳ Перевіряю...', en: '⏳ Checking...', ru: '⏳ Проверяю...' },
        'token.valid': { uk: '✅ Бот знайдено', en: '✅ Bot found', ru: '✅ Бот найден' },
        'token.invalid': { uk: '❌ Токен невалідний', en: '❌ Invalid token', ru: '❌ Токен невалидный' },

        // ─── Bot Types ───────────────────────────────────────────
        'botType.menu.display': { uk: '🏢 Бот-візитка / Меню', en: '🏢 Business Card / Menu Bot', ru: '🏢 Бот-визитка / Меню' },
        'botType.menu.desc': { uk: 'Багаторівнева навігація кнопками з інформацією про компанію.', en: 'Multi-level button navigation with company information.', ru: 'Многоуровневая навигация кнопками с информацией о компании.' },
        'botType.feedback.display': { uk: '💬 Зворотний зв\'язок', en: '💬 Feedback Bot', ru: '💬 Обратная связь' },
        'botType.feedback.desc': { uk: 'Користувач пише — повідомлення пересилається адміну.', en: 'User writes — message is forwarded to admin.', ru: 'Пользователь пишет — сообщение пересылается админу.' },
        'botType.leadgen.display': { uk: '📝 Збір заявок', en: '📝 Lead Generation', ru: '📝 Сбор заявок' },
        'botType.leadgen.desc': { uk: 'Покроковий опитувальник з надсиланням заявки адміну.', en: 'Step-by-step survey with lead submission to admin.', ru: 'Пошаговый опросник с отправкой заявки админу.' },
        'botType.ai_assistant.display': { uk: '🤖 AI-асистент', en: '🤖 AI Assistant', ru: '🤖 AI-ассистент' },
        'botType.ai_assistant.desc': { uk: 'Бот з підключенням до ChatGPT / OpenAI API.', en: 'Bot connected to ChatGPT / OpenAI API.', ru: 'Бот с подключением к ChatGPT / OpenAI API.' },
        'botType.catalog.display': { uk: '🛍 Каталог товарів', en: '🛍 Product Catalog', ru: '🛍 Каталог товаров' },
        'botType.catalog.desc': { uk: 'Категорії, товари, кошик, оформлення замовлення.', en: 'Categories, products, cart, order placement.', ru: 'Категории, товары, корзина, оформление заказа.' },

        // ─── Wizard Form: Common Fields ──────────────────────────
        'field.botName': { uk: 'Назва проєкту', en: 'Project Name', ru: 'Название проекта' },
        'field.botToken': { uk: 'Токен бота', en: 'Bot Token', ru: 'Токен бота' },
        'field.botTokenHint': { uk: 'Отримайте у @BotFather в Telegram', en: 'Get it from @BotFather in Telegram', ru: 'Получите у @BotFather в Telegram' },
        'field.welcomeText': { uk: 'Привітальне повідомлення', en: 'Welcome Message', ru: 'Приветственное сообщение' },
        'field.adminChatId': { uk: 'Chat ID адміна', en: 'Admin Chat ID', ru: 'Chat ID админа' },
        'field.adminChatIdHint': { uk: 'Дізнатись свій ID: @userinfobot', en: 'Find your ID: @userinfobot', ru: 'Узнать свой ID: @userinfobot' },

        // ─── Wizard Form: Menu Bot ───────────────────────────────
        'wizard.menu.title': { uk: 'Налаштування бота-візитки', en: 'Business Card Bot Setup', ru: 'Настройка бота-визитки' },
        'wizard.menu.subtitle': { uk: 'Створіть меню з кнопками та інформацією', en: 'Create a menu with buttons and information', ru: 'Создайте меню с кнопками и информацией' },
        'field.menuItems': { uk: 'Пункти меню', en: 'Menu Items', ru: 'Пункты меню' },
        'field.menuItems.add': { uk: '+ Додати пункт меню', en: '+ Add Menu Item', ru: '+ Добавить пункт меню' },
        'field.menuItems.btnPlaceholder': { uk: 'Назва кнопки', en: 'Button Label', ru: 'Название кнопки' },
        'field.menuItems.textPlaceholder': { uk: 'Текст відповіді', en: 'Response Text', ru: 'Текст ответа' },

        // Defaults for menu items
        'default.menu.welcome': { uk: '👋 Вітаємо! Оберіть розділ:', en: '👋 Welcome! Choose a section:', ru: '👋 Добро пожаловать! Выберите раздел:' },
        'default.menu.about.label': { uk: 'ℹ️ Про нас', en: 'ℹ️ About Us', ru: 'ℹ️ О нас' },
        'default.menu.about.text': { uk: 'Ми — сучасна компанія, що надає якісні послуги.', en: 'We are a modern company providing quality services.', ru: 'Мы — современная компания, предоставляющая качественные услуги.' },
        'default.menu.services.label': { uk: '🔧 Послуги', en: '🔧 Services', ru: '🔧 Услуги' },
        'default.menu.services.text': { uk: 'Наші послуги:\n• Консультації\n• Розробка\n• Підтримка', en: 'Our services:\n• Consulting\n• Development\n• Support', ru: 'Наши услуги:\n• Консультации\n• Разработка\n• Поддержка' },
        'default.menu.contacts.label': { uk: '📞 Контакти', en: '📞 Contacts', ru: '📞 Контакты' },
        'default.menu.contacts.text': { uk: '📞 +380XXXXXXXXX\n📧 info@example.com\n📍 Київ, Україна', en: '📞 +1XXXXXXXXX\n📧 info@example.com\n📍 New York, USA', ru: '📞 +7XXXXXXXXX\n📧 info@example.com\n📍 Москва, Россия' },

        // ─── Wizard Form: Feedback Bot ───────────────────────────
        'wizard.feedback.title': { uk: 'Налаштування бота підтримки', en: 'Support Bot Setup', ru: 'Настройка бота поддержки' },
        'wizard.feedback.subtitle': { uk: 'Користувач пише — ви відповідаєте', en: 'User writes — you respond', ru: 'Пользователь пишет — вы отвечаете' },
        'default.feedback.welcome': { uk: '👋 Вітаємо! Напишіть ваше повідомлення, і ми обов\'язково відповімо.', en: '👋 Welcome! Write your message and we will definitely respond.', ru: '👋 Приветствуем! Напишите ваше сообщение, и мы обязательно ответим.' },

        // ─── Wizard Form: Leadgen Bot ────────────────────────────
        'wizard.leadgen.title': { uk: 'Налаштування бота заявок', en: 'Lead Bot Setup', ru: 'Настройка бота заявок' },
        'wizard.leadgen.subtitle': { uk: 'Покроковий опитувальник для збору лідів', en: 'Step-by-step survey for lead collection', ru: 'Пошаговый опросник для сбора лидов' },
        'field.services': { uk: 'Послуги (для вибору)', en: 'Services (for selection)', ru: 'Услуги (для выбора)' },
        'field.services.placeholder': { uk: 'Нова послуга...', en: 'New service...', ru: 'Новая услуга...' },
        'field.thankYouText': { uk: 'Повідомлення після заявки', en: 'Post-submission message', ru: 'Сообщение после заявки' },
        'default.leadgen.welcome': { uk: '👋 Вітаємо! Залиште заявку, і ми зв\'яжемося з вами.', en: '👋 Welcome! Leave a request and we will contact you.', ru: '👋 Приветствуем! Оставьте заявку, и мы свяжемся с вами.' },
        'default.leadgen.thankYou': { uk: '✅ Дякуємо! Вашу заявку прийнято.', en: '✅ Thank you! Your request has been received.', ru: '✅ Спасибо! Ваша заявка принята.' },
        'default.leadgen.services': { uk: ['Консультація', 'Розробка сайту', 'Дизайн', 'Інше'], en: ['Consultation', 'Website Development', 'Design', 'Other'], ru: ['Консультация', 'Разработка сайта', 'Дизайн', 'Другое'] },

        // ─── Wizard Form: AI Bot ─────────────────────────────────
        'wizard.ai.title': { uk: 'Налаштування AI-асистента', en: 'AI Assistant Setup', ru: 'Настройка AI-ассистента' },
        'wizard.ai.subtitle': { uk: 'Бот з підключенням до ChatGPT', en: 'Bot connected to ChatGPT', ru: 'Бот с подключением к ChatGPT' },
        'field.aiSystemPrompt': { uk: 'Системний промпт (роль AI)', en: 'System Prompt (AI role)', ru: 'Системный промпт (роль AI)' },
        'field.aiModel': { uk: 'Модель OpenAI', en: 'OpenAI Model', ru: 'Модель OpenAI' },
        'default.ai.welcome': { uk: '🤖 Вітаю! Я AI-асистент. Задайте мені будь-яке питання!', en: '🤖 Hello! I\'m an AI assistant. Ask me anything!', ru: '🤖 Привет! Я AI-ассистент. Задайте мне любой вопрос!' },
        'default.ai.systemPrompt': { uk: 'Ти — корисний AI-асистент. Відповідай українською мовою, коротко та по суті.', en: 'You are a helpful AI assistant. Answer in English, concisely and to the point.', ru: 'Ты — полезный AI-ассистент. Отвечай на русском языке, кратко и по делу.' },

        // ─── Wizard Form: Catalog Bot ────────────────────────────
        'wizard.catalog.title': { uk: 'Налаштування каталогу товарів', en: 'Product Catalog Setup', ru: 'Настройка каталога товаров' },
        'wizard.catalog.subtitle': { uk: 'Категорії, товари, кошик та замовлення', en: 'Categories, products, cart and orders', ru: 'Категории, товары, корзина и заказы' },
        'default.catalog.welcome': { uk: '🛍 Вітаємо в нашому магазині! Оберіть категорію:', en: '🛍 Welcome to our store! Choose a category:', ru: '🛍 Добро пожаловать в наш магазин! Выберите категорию:' },

        // ─── Simulator Messages ──────────────────────────────────
        'sim.backToMain': { uk: '⬅️ На головну', en: '⬅️ Back to Main', ru: '⬅️ На главную' },
        'sim.feedback.userMsg': { uk: 'Привіт! Маю питання щодо вашої послуги.', en: 'Hi! I have a question about your service.', ru: 'Привет! У меня вопрос по вашей услуге.' },
        'sim.feedback.response': { uk: '✅ Ваше повідомлення надіслано! Ми відповімо найближчим часом.', en: '✅ Your message has been sent! We will respond shortly.', ru: '✅ Ваше сообщение отправлено! Мы ответим в ближайшее время.' },
        'sim.leadgen.askName': { uk: '📝 Як вас звати?', en: '📝 What is your name?', ru: '📝 Как вас зовут?' },
        'sim.leadgen.userName': { uk: 'Олександр', en: 'Alexander', ru: 'Александр' },
        'sim.leadgen.askPhone': { uk: '📞 Ваш номер телефону:', en: '📞 Your phone number:', ru: '📞 Ваш номер телефона:' },
        'sim.leadgen.sharePhone': { uk: '📱 Поділитися номером', en: '📱 Share Phone Number', ru: '📱 Поделиться номером' },
        'sim.leadgen.selectService': { uk: '🔧 Оберіть послугу:', en: '🔧 Select a service:', ru: '🔧 Выберите услугу:' },
        'sim.ai.userMsg': { uk: 'Що таке штучний інтелект?', en: 'What is artificial intelligence?', ru: 'Что такое искусственный интеллект?' },
        'sim.ai.response': {
            uk: 'Штучний інтелект (AI) — це галузь комп\'ютерних наук, що займається створенням систем, здатних виконувати завдання, які зазвичай вимагають людського інтелекту: розпізнавання мови, прийняття рішень, переклад тощо. 🧠',
            en: 'Artificial Intelligence (AI) is a branch of computer science focused on creating systems capable of performing tasks that typically require human intelligence: speech recognition, decision making, translation, etc. 🧠',
            ru: 'Искусственный интеллект (AI) — это область компьютерных наук, занимающаяся созданием систем, способных выполнять задачи, обычно требующие человеческого интеллекта: распознавание речи, принятие решений, перевод и т.д. 🧠',
        },
        'sim.catalog.electronics': { uk: '📱 Електроніка', en: '📱 Electronics', ru: '📱 Электроника' },
        'sim.catalog.accessories': { uk: '🎒 Аксесуари', en: '🎒 Accessories', ru: '🎒 Аксессуары' },
        'sim.catalog.cart': { uk: '🛒 Кошик', en: '🛒 Cart', ru: '🛒 Корзина' },
        'sim.defaultPreview': { uk: '👋 Оберіть тип бота, щоб побачити попередній перегляд.', en: '👋 Select a bot type to see the preview.', ru: '👋 Выберите тип бота, чтобы увидеть предпросмотр.' },

        // ─── AI Model Labels ─────────────────────────────────────
        'model.gpt4omini': { uk: 'GPT-4o Mini (дешевий, швидкий)', en: 'GPT-4o Mini (cheap, fast)', ru: 'GPT-4o Mini (дешёвый, быстрый)' },
        'model.gpt4o': { uk: 'GPT-4o (потужний)', en: 'GPT-4o (powerful)', ru: 'GPT-4o (мощный)' },
        'model.gpt41nano': { uk: 'GPT-4.1 Nano (бюджетний)', en: 'GPT-4.1 Nano (budget)', ru: 'GPT-4.1 Nano (бюджетный)' },

        // ─── Menu Item: New Item ─────────────────────────────────
        'default.menu.newItem.label': { uk: '📌 Новий пункт', en: '📌 New Item', ru: '📌 Новый пункт' },
        'default.menu.newItem.text': { uk: 'Текст нового пункту', en: 'New item text', ru: 'Текст нового пункта' },

        // ─── Bot Type: Stars Shop ────────────────────────────────
        'botType.stars_shop.display': { uk: '⭐ Продаж за Telegram Stars', en: '⭐ Sell for Telegram Stars', ru: '⭐ Продажа за Telegram Stars' },
        'botType.stars_shop.desc': { uk: 'Продаж файлів та посилань за Telegram Stars (XTR).', en: 'Sell files and links for Telegram Stars (XTR).', ru: 'Продажа файлов и ссылок за Telegram Stars (XTR).' },

        // ─── Wizard Form: Stars Shop ─────────────────────────────
        'wizard.stars.title': { uk: 'Налаштування Stars-магазину', en: 'Stars Shop Setup', ru: 'Настройка Stars-магазина' },
        'wizard.stars.subtitle': { uk: 'Продавайте файли та посилання за Telegram Stars ⭐', en: 'Sell files and links for Telegram Stars ⭐', ru: 'Продавайте файлы и ссылки за Telegram Stars ⭐' },
        'field.products': { uk: 'Товари', en: 'Products', ru: 'Товары' },
        'field.products.add': { uk: '+ Додати товар', en: '+ Add Product', ru: '+ Добавить товар' },
        'field.products.titlePlaceholder': { uk: 'Назва товару', en: 'Product Title', ru: 'Название товара' },
        'field.products.descPlaceholder': { uk: 'Опис товару', en: 'Product Description', ru: 'Описание товара' },
        'field.products.pricePlaceholder': { uk: 'Ціна в ⭐', en: 'Price in ⭐', ru: 'Цена в ⭐' },
        'field.products.contentPlaceholder': { uk: 'Файл або посилання', en: 'File or Link', ru: 'Файл или ссылка' },
        'field.products.typeFile': { uk: '📄 Файл', en: '📄 File', ru: '📄 Файл' },
        'field.products.typeLink': { uk: '🔗 Посилання', en: '🔗 Link', ru: '🔗 Ссылка' },

        // Stars & Crypto fields
        'field.starsRecipient': { uk: 'ID отримувача Stars ⭐', en: 'Stars Recipient ID ⭐', ru: 'ID получателя Stars ⭐' },
        'field.starsRecipientHint': { uk: 'Telegram ID акаунту куди будуть надходити зірки (ваш @BotFather ID)', en: 'Telegram ID of the account to receive Stars (your @BotFather ID)', ru: 'Telegram ID аккаунта для получения звёзд (ваш @BotFather ID)' },
        'field.cryptoWallet': { uk: '💎 Крипто-гаманець (опціонально)', en: '💎 Crypto Wallet (optional)', ru: '💎 Крипто-кошелёк (опционально)' },
        'field.cryptoWalletHint': { uk: 'USDT TRC-20, TON або інша адреса для виведення', en: 'USDT TRC-20, TON or other withdrawal address', ru: 'USDT TRC-20, TON или другой адрес для вывода' },

        // Instances panel
        'instances.dashTitle': { uk: 'ACTIVE_INSTANCES // РЕЄСТР', en: 'ACTIVE_INSTANCES // REGISTRY', ru: 'ACTIVE_INSTANCES // РЕЕСТР' },
        'instances.deployMode': { uk: 'РЕЖИМ', en: 'MODE', ru: 'РЕЖИМ' },
        'instances.modeLocal': { uk: '🖥️ ЛОКАЛЬНО', en: '🖥️ LOCAL', ru: '🖥️ ЛОКАЛЬНО' },
        'instances.modeZip': { uk: '📦 ZIP', en: '📦 ZIP', ru: '📦 ZIP' },
        'instances.modeServer': { uk: '☁️ СЕРВЕР', en: '☁️ SERVER', ru: '☁️ СЕРВЕР' },
        'instances.exportZip': { uk: '📦 Експорт ZIP', en: '📦 Export ZIP', ru: '📦 Экспорт ZIP' },
        'instances.start': { uk: '▶ Старт', en: '▶ Start', ru: '▶ Старт' },
        'instances.stop': { uk: '⏹ Стоп', en: '⏹ Stop', ru: '⏹ Стоп' },
        'instances.empty': { uk: 'Немає активних ботів', en: 'No active bots', ru: 'Нет активных ботов' },
        'instances.emptyHint': { uk: 'Створіть бота у Builder Engine', en: 'Create a bot in Builder Engine', ru: 'Создайте бота в Builder Engine' },
        'default.stars.welcome': { uk: '⭐ Вітаємо в магазині цифрових товарів!\\nОберіть товар для покупки за Telegram Stars:', en: '⭐ Welcome to the digital store!\\nChoose a product to buy with Telegram Stars:', ru: '⭐ Добро пожаловать в магазин цифровых товаров!\\nВыберите товар для покупки за Telegram Stars:' },

        // Default products for stars shop
        'default.stars.products': {
            uk: [
                { id: 'item1', title: '📘 Електронна книга', description: 'Повний гайд з програмування на Python', price: 50, type: 'file', content: 'ebook.pdf' },
                { id: 'item2', title: '🔗 VIP-канал', description: 'Доступ до закритого Telegram-каналу', price: 100, type: 'link', content: 'https://t.me/+SECRET_INVITE_LINK' },
                { id: 'item3', title: '📦 Шаблон бота', description: 'Готовий шаблон Telegram-бота для бізнесу', price: 75, type: 'file', content: 'bot_template.zip' },
            ],
            en: [
                { id: 'item1', title: '📘 E-Book', description: 'Complete Python programming guide', price: 50, type: 'file', content: 'ebook.pdf' },
                { id: 'item2', title: '🔗 VIP Channel', description: 'Access to private Telegram channel', price: 100, type: 'link', content: 'https://t.me/+SECRET_INVITE_LINK' },
                { id: 'item3', title: '📦 Bot Template', description: 'Ready-made Telegram bot template for business', price: 75, type: 'file', content: 'bot_template.zip' },
            ],
            ru: [
                { id: 'item1', title: '📘 Электронная книга', description: 'Полный гайд по программированию на Python', price: 50, type: 'file', content: 'ebook.pdf' },
                { id: 'item2', title: '🔗 VIP-канал', description: 'Доступ к закрытому Telegram-каналу', price: 100, type: 'link', content: 'https://t.me/+SECRET_INVITE_LINK' },
                { id: 'item3', title: '📦 Шаблон бота', description: 'Готовый шаблон Telegram-бота для бизнеса', price: 75, type: 'file', content: 'bot_template.zip' },
            ],
        },

        // ─── Simulator: Stars Shop ───────────────────────────────
        'sim.stars.payBtn': { uk: '💳 Купити за', en: '💳 Buy for', ru: '💳 Купить за' },
        'sim.stars.myPurchases': { uk: '📋 Мої покупки', en: '📋 My Purchases', ru: '📋 Мои покупки' },
        'sim.stars.backCatalog': { uk: '⬅️ Каталог', en: '⬅️ Catalog', ru: '⬅️ Каталог' },
        'sim.stars.payDialog': { uk: '⭐ Оплата Telegram Stars', en: '⭐ Telegram Stars Payment', ru: '⭐ Оплата Telegram Stars' },
        'sim.stars.payConfirm': { uk: 'Підтвердити оплату', en: 'Confirm Payment', ru: 'Подтвердить оплату' },
        'sim.stars.paySuccess': { uk: '✅ Оплата пройшла успішно!', en: '✅ Payment successful!', ru: '✅ Оплата прошла успешно!' },
        'sim.stars.payDelivered': { uk: '📦 Ваш товар:', en: '📦 Your product:', ru: '📦 Ваш товар:' },
    };

    // ═══════════════════════════════════════════════════════════════
    //  CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get translation for a key. Returns fallback or key if not found.
     */
    function t(key, fallback) {
        const entry = DICT[key];
        if (!entry) return fallback || key;
        return entry[_currentLang] || entry['uk'] || fallback || key;
    }

    /**
     * Get current language code.
     */
    function getLang() {
        return _currentLang;
    }

    /**
     * Set language and update all data-i18n elements on the page.
     * Saves preference to localStorage.
     */
    function setLanguage(lang) {
        if (!['uk', 'en', 'ru'].includes(lang)) return;
        _currentLang = lang;
        localStorage.setItem('tg_console_lang', lang);

        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = t(key);
            if (translation && translation !== key) {
                // Check if element has special i18n target
                const target = el.getAttribute('data-i18n-target');
                if (target === 'placeholder') {
                    el.placeholder = translation;
                } else if (target === 'title') {
                    el.title = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = lang === 'uk' ? 'uk' : lang === 'ru' ? 'ru' : 'en';

        // Update language switcher buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
    }

    /**
     * Initialize i18n — restore saved language.
     */
    function init() {
        const saved = localStorage.getItem('tg_console_lang');
        if (saved && ['uk', 'en', 'ru'].includes(saved)) {
            _currentLang = saved;
        }
        // Set active button state on init
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === _currentLang);
        });
    }

    /**
     * Check all keys have translations for all languages.
     * Returns array of missing entries (for debugging).
     */
    function audit() {
        const missing = [];
        const langs = ['uk', 'en', 'ru'];
        for (const [key, entry] of Object.entries(DICT)) {
            for (const lang of langs) {
                if (entry[lang] === undefined || entry[lang] === '') {
                    missing.push({ key, lang });
                }
            }
        }
        return missing;
    }

    // ─── Public API ──────────────────────────────────────────────
    return {
        t,
        getLang,
        setLanguage,
        init,
        audit,
        DICT,
    };
})();
