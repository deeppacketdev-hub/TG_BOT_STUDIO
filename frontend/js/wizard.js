/**
 * TG Bot Builder — Wizard Configuration Forms
 * Dynamically generates form fields based on selected bot type.
 * All labels, placeholders, hints, and defaults use I18n.t().
 */

const Wizard = (() => {
    const $ = (sel) => document.querySelector(sel);

    // ─── Build Form Schemas Dynamically (i18n-aware) ─────────────
    function getFormSchemas() {
        return {
            menu: {
                titleKey: 'wizard.menu.title',
                subtitleKey: 'wizard.menu.subtitle',
                fields: [
                    { id: 'bot_name', labelKey: 'field.botName', type: 'text', placeholder: 'my-business-bot', value: 'my-business-bot' },
                    { id: 'bot_token', labelKey: 'field.botToken', type: 'text', placeholder: '123456:ABC-DEF...', hintKey: 'field.botTokenHint', hasValidation: true },
                    { id: 'welcome_text', labelKey: 'field.welcomeText', type: 'textarea', placeholderKey: 'default.menu.welcome', valueKey: 'default.menu.welcome' },
                    { id: 'menu_items', labelKey: 'field.menuItems', type: 'menu_editor' },
                ],
            },
            feedback: {
                titleKey: 'wizard.feedback.title',
                subtitleKey: 'wizard.feedback.subtitle',
                fields: [
                    { id: 'bot_name', labelKey: 'field.botName', type: 'text', placeholder: 'support-bot', value: 'support-bot' },
                    { id: 'bot_token', labelKey: 'field.botToken', type: 'text', placeholder: '123456:ABC-DEF...', hintKey: 'field.botTokenHint', hasValidation: true },
                    { id: 'welcome_text', labelKey: 'field.welcomeText', type: 'textarea', placeholderKey: 'default.feedback.welcome', valueKey: 'default.feedback.welcome' },
                    { id: 'admin_chat_id', labelKey: 'field.adminChatId', type: 'text', placeholder: '123456789', hintKey: 'field.adminChatIdHint' },
                ],
            },
            leadgen: {
                titleKey: 'wizard.leadgen.title',
                subtitleKey: 'wizard.leadgen.subtitle',
                fields: [
                    { id: 'bot_name', labelKey: 'field.botName', type: 'text', placeholder: 'leads-bot', value: 'leads-bot' },
                    { id: 'bot_token', labelKey: 'field.botToken', type: 'text', placeholder: '123456:ABC-DEF...', hintKey: 'field.botTokenHint', hasValidation: true },
                    { id: 'welcome_text', labelKey: 'field.welcomeText', type: 'textarea', placeholderKey: 'default.leadgen.welcome', valueKey: 'default.leadgen.welcome' },
                    { id: 'admin_chat_id', labelKey: 'field.adminChatId', type: 'text', placeholder: '123456789', hintKey: 'field.adminChatIdHint' },
                    { id: 'services', labelKey: 'field.services', type: 'services_editor' },
                    { id: 'thank_you_text', labelKey: 'field.thankYouText', type: 'textarea', placeholderKey: 'default.leadgen.thankYou', valueKey: 'default.leadgen.thankYou' },
                ],
            },
            ai_assistant: {
                titleKey: 'wizard.ai.title',
                subtitleKey: 'wizard.ai.subtitle',
                fields: [
                    { id: 'bot_name', labelKey: 'field.botName', type: 'text', placeholder: 'ai-assistant-bot', value: 'ai-assistant-bot' },
                    { id: 'bot_token', labelKey: 'field.botToken', type: 'text', placeholder: '123456:ABC-DEF...', hintKey: 'field.botTokenHint', hasValidation: true },
                    { id: 'welcome_text', labelKey: 'field.welcomeText', type: 'textarea', placeholderKey: 'default.ai.welcome', valueKey: 'default.ai.welcome' },
                    { id: 'ai_system_prompt', labelKey: 'field.aiSystemPrompt', type: 'textarea', placeholderKey: 'default.ai.systemPrompt', valueKey: 'default.ai.systemPrompt' },
                    { id: 'ai_model', labelKey: 'field.aiModel', type: 'select', options: [
                        { value: 'gpt-4o-mini', labelKey: 'model.gpt4omini' },
                        { value: 'gpt-4o', labelKey: 'model.gpt4o' },
                        { value: 'gpt-4.1-nano', labelKey: 'model.gpt41nano' },
                    ]},
                ],
            },
            catalog: {
                titleKey: 'wizard.catalog.title',
                subtitleKey: 'wizard.catalog.subtitle',
                fields: [
                    { id: 'bot_name', labelKey: 'field.botName', type: 'text', placeholder: 'shop-bot', value: 'shop-bot' },
                    { id: 'bot_token', labelKey: 'field.botToken', type: 'text', placeholder: '123456:ABC-DEF...', hintKey: 'field.botTokenHint', hasValidation: true },
                    { id: 'welcome_text', labelKey: 'field.welcomeText', type: 'textarea', placeholderKey: 'default.catalog.welcome', valueKey: 'default.catalog.welcome' },
                ],
            },
            stars_shop: {
                titleKey: 'wizard.stars.title',
                subtitleKey: 'wizard.stars.subtitle',
                fields: [
                    { id: 'bot_name', labelKey: 'field.botName', type: 'text', placeholder: 'stars-shop-bot', value: 'stars-shop-bot' },
                    { id: 'bot_token', labelKey: 'field.botToken', type: 'text', placeholder: '123456:ABC-DEF...', hintKey: 'field.botTokenHint', hasValidation: true },
                    { id: 'welcome_text', labelKey: 'field.welcomeText', type: 'textarea', placeholderKey: 'default.stars.welcome', valueKey: 'default.stars.welcome' },
                    { id: 'stars_recipient_id', labelKey: 'field.starsRecipient', type: 'text', placeholder: '123456789', hintKey: 'field.starsRecipientHint' },
                    { id: 'crypto_wallet', labelKey: 'field.cryptoWallet', type: 'text', placeholder: 'TQn9Y2khEsLJW1ChNWd...', hintKey: 'field.cryptoWalletHint' },
                    { id: 'products', labelKey: 'field.products', type: 'products_editor' },
                ],
            },
        };
    }

    // Default menu items (i18n-aware)
    function getDefaultMenuItems() {
        return [
            { id: 'about', label: I18n.t('default.menu.about.label'), text: I18n.t('default.menu.about.text') },
            { id: 'services', label: I18n.t('default.menu.services.label'), text: I18n.t('default.menu.services.text') },
            { id: 'contacts', label: I18n.t('default.menu.contacts.label'), text: I18n.t('default.menu.contacts.text') },
        ];
    }

    function getDefaultServices() {
        const services = I18n.t('default.leadgen.services');
        // The i18n entry can be an array
        if (Array.isArray(services)) return [...services];
        return ['Консультація', 'Розробка сайту', 'Дизайн', 'Інше'];
    }

    function getDefaultProducts() {
        const products = I18n.t('default.stars.products');
        if (Array.isArray(products)) return products.map(p => ({ ...p }));
        return [
            { id: 'item1', title: '📘 Електронна книга', description: 'Повний гайд', price: 50, type: 'file', content: 'ebook.pdf' },
            { id: 'item2', title: '🔗 VIP-канал', description: 'Доступ до каналу', price: 100, type: 'link', content: 'https://t.me/+SECRET' },
        ];
    }

    let _menuItems = [];
    let _services = [];
    let _products = [];

    // ─── Setup Config Form ───────────────────────────────────────
    function setupConfigForm() {
        const botType = App.state.selectedBotType;
        const schemas = getFormSchemas();
        const schema = schemas[botType];
        if (!schema) return;

        $('#configTitle').textContent = I18n.t(schema.titleKey);
        $('#configSubtitle').textContent = I18n.t(schema.subtitleKey);

        const form = $('#configForm');
        form.innerHTML = '';

        _menuItems = getDefaultMenuItems();
        _services = getDefaultServices();
        _products = getDefaultProducts();

        schema.fields.forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group';

            const label = field.labelKey ? I18n.t(field.labelKey) : field.label || '';
            const hint = field.hintKey ? I18n.t(field.hintKey) : field.hint || '';
            const placeholder = field.placeholderKey ? I18n.t(field.placeholderKey) : field.placeholder || '';
            const value = field.valueKey ? I18n.t(field.valueKey) : field.value || '';

            if (field.type === 'menu_editor') {
                group.innerHTML = `<label class="form-label">${label}</label>`;
                group.appendChild(buildMenuEditor());
            } else if (field.type === 'services_editor') {
                group.innerHTML = `<label class="form-label">${label}</label>`;
                group.appendChild(buildServicesEditor());
            } else if (field.type === 'products_editor') {
                group.innerHTML = `<label class="form-label">${label}</label>`;
                group.appendChild(buildProductsEditor());
            } else if (field.type === 'select') {
                const options = field.options.map(o => {
                    const optLabel = o.labelKey ? I18n.t(o.labelKey) : o.label || o.value;
                    return `<option value="${o.value}">${optLabel}</option>`;
                }).join('');
                group.innerHTML = `
                    <label class="form-label" for="${field.id}">${label}</label>
                    <select class="form-select" id="${field.id}">${options}</select>
                `;
            } else if (field.type === 'textarea') {
                group.innerHTML = `
                    <label class="form-label" for="${field.id}">${label}</label>
                    <textarea class="form-textarea" id="${field.id}" placeholder="${placeholder}">${value}</textarea>
                    ${hint ? `<span class="form-hint">${hint}</span>` : ''}
                `;
            } else {
                group.innerHTML = `
                    <label class="form-label" for="${field.id}">${label}</label>
                    <input class="form-input" type="${field.type}" id="${field.id}"
                           placeholder="${placeholder}"
                           value="${value}">
                    ${hint ? `<span class="form-hint">${hint}</span>` : ''}
                    ${field.hasValidation ? '<div class="token-status" id="tokenStatus" style="display:none"></div>' : ''}
                `;
            }

            form.appendChild(group);
        });

        // Bind token validation
        const tokenInput = $('#bot_token');
        if (tokenInput) {
            tokenInput.addEventListener('input', (e) => {
                App.validateToken(e.target.value);
            });
        }

        // Update simulator
        Simulator.updatePreview(botType);
    }

    // ─── Menu Items Editor ───────────────────────────────────────
    function buildMenuEditor() {
        const container = document.createElement('div');
        container.className = 'menu-items-editor';
        container.id = 'menuItemsEditor';

        renderMenuItems(container);

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn-add-item';
        addBtn.textContent = I18n.t('field.menuItems.add');
        addBtn.addEventListener('click', () => {
            const id = `item_${Date.now()}`;
            _menuItems.push({
                id,
                label: I18n.t('default.menu.newItem.label'),
                text: I18n.t('default.menu.newItem.text'),
            });
            renderMenuItems(container);
            Simulator.updatePreview('menu');
        });
        container.appendChild(addBtn);

        return container;
    }

    function renderMenuItems(container) {
        container.querySelectorAll('.menu-item-row').forEach(r => r.remove());

        const addBtn = container.querySelector('.btn-add-item');
        const btnPlaceholder = I18n.t('field.menuItems.btnPlaceholder');
        const textPlaceholder = I18n.t('field.menuItems.textPlaceholder');

        _menuItems.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'menu-item-row';
            row.innerHTML = `
                <input type="text" value="${item.label}" placeholder="${btnPlaceholder}"
                       data-idx="${idx}" data-field="label">
                <textarea placeholder="${textPlaceholder}" data-idx="${idx}" data-field="text">${item.text}</textarea>
                <button type="button" class="btn-remove-item" data-idx="${idx}">✕</button>
            `;

            row.querySelectorAll('input, textarea').forEach(el => {
                el.addEventListener('input', (e) => {
                    const i = parseInt(e.target.dataset.idx);
                    const f = e.target.dataset.field;
                    _menuItems[i][f] = e.target.value;
                    Simulator.updatePreview('menu');
                });
            });

            row.querySelector('.btn-remove-item').addEventListener('click', (e) => {
                const i = parseInt(e.target.dataset.idx);
                _menuItems.splice(i, 1);
                renderMenuItems(container);
                Simulator.updatePreview('menu');
            });

            if (addBtn) {
                container.insertBefore(row, addBtn);
            } else {
                container.appendChild(row);
            }
        });
    }

    // ─── Services Editor ─────────────────────────────────────────
    function buildServicesEditor() {
        const container = document.createElement('div');
        container.id = 'servicesEditor';

        renderServices(container);
        return container;
    }

    function renderServices(container) {
        container.innerHTML = '';

        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'services-editor';

        _services.forEach((svc, idx) => {
            const tag = document.createElement('span');
            tag.className = 'service-tag';
            tag.innerHTML = `${svc} <span class="remove-svc" data-idx="${idx}">×</span>`;
            tag.querySelector('.remove-svc').addEventListener('click', (e) => {
                _services.splice(parseInt(e.target.dataset.idx), 1);
                renderServices(container);
                Simulator.updatePreview('leadgen');
            });
            tagsDiv.appendChild(tag);
        });

        container.appendChild(tagsDiv);

        const addDiv = document.createElement('div');
        addDiv.className = 'add-service-input';
        addDiv.innerHTML = `
            <input class="form-input" type="text" placeholder="${I18n.t('field.services.placeholder')}" id="newServiceInput">
            <button class="btn-add-item" style="width:auto;padding:8px 16px;" id="addServiceBtn">+</button>
        `;

        const addService = () => {
            const input = container.querySelector('#newServiceInput');
            const val = input.value.trim();
            if (val) {
                _services.push(val);
                input.value = '';
                renderServices(container);
                Simulator.updatePreview('leadgen');
            }
        };

        addDiv.querySelector('#addServiceBtn').addEventListener('click', addService);
        addDiv.querySelector('#newServiceInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addService(); }
        });

        container.appendChild(addDiv);
    }

    // ─── Products Editor (Stars Shop) ────────────────────────────
    function buildProductsEditor() {
        const container = document.createElement('div');
        container.className = 'products-editor';
        container.id = 'productsEditor';

        renderProducts(container);

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn-add-item';
        addBtn.textContent = I18n.t('field.products.add');
        addBtn.addEventListener('click', () => {
            const id = `item_${Date.now()}`;
            _products.push({
                id,
                title: '',
                description: '',
                price: 50,
                type: 'file',
                content: '',
            });
            renderProducts(container);
            Simulator.updatePreview('stars_shop');
        });
        container.appendChild(addBtn);

        return container;
    }

    function renderProducts(container) {
        container.querySelectorAll('.product-row').forEach(r => r.remove());

        const addBtn = container.querySelector('.btn-add-item');
        const titlePh = I18n.t('field.products.titlePlaceholder');
        const descPh = I18n.t('field.products.descPlaceholder');
        const pricePh = I18n.t('field.products.pricePlaceholder');
        const contentPh = I18n.t('field.products.contentPlaceholder');
        const typeFile = I18n.t('field.products.typeFile');
        const typeLink = I18n.t('field.products.typeLink');

        _products.forEach((prod, idx) => {
            const row = document.createElement('div');
            row.className = 'product-row';
            row.innerHTML = `
                <div class="product-row-header">
                    <span class="product-idx">#${idx + 1}</span>
                    <button type="button" class="btn-remove-item" data-idx="${idx}">✕</button>
                </div>
                <input type="text" value="${prod.title}" placeholder="${titlePh}"
                       data-idx="${idx}" data-field="title" class="form-input">
                <input type="text" value="${prod.description}" placeholder="${descPh}"
                       data-idx="${idx}" data-field="description" class="form-input">
                <div class="product-price-row">
                    <input type="number" value="${prod.price}" placeholder="${pricePh}" min="1"
                           data-idx="${idx}" data-field="price" class="form-input" style="width:120px">
                    <span class="price-star">⭐</span>
                    <select data-idx="${idx}" data-field="type" class="form-select" style="width:140px">
                        <option value="file" ${prod.type === 'file' ? 'selected' : ''}>${typeFile}</option>
                        <option value="link" ${prod.type === 'link' ? 'selected' : ''}>${typeLink}</option>
                    </select>
                </div>
                <input type="text" value="${prod.content || ''}" placeholder="${contentPh}"
                       data-idx="${idx}" data-field="content" class="form-input">
            `;

            row.querySelectorAll('input, select').forEach(el => {
                el.addEventListener('input', (e) => {
                    const i = parseInt(e.target.dataset.idx);
                    const f = e.target.dataset.field;
                    let val = e.target.value;
                    if (f === 'price') val = parseInt(val) || 0;
                    _products[i][f] = val;
                    Simulator.updatePreview('stars_shop');
                });
                el.addEventListener('change', (e) => {
                    const i = parseInt(e.target.dataset.idx);
                    const f = e.target.dataset.field;
                    _products[i][f] = e.target.value;
                    Simulator.updatePreview('stars_shop');
                });
            });

            row.querySelector('.btn-remove-item').addEventListener('click', (e) => {
                const i = parseInt(e.target.dataset.idx);
                _products.splice(i, 1);
                renderProducts(container);
                Simulator.updatePreview('stars_shop');
            });

            if (addBtn) {
                container.insertBefore(row, addBtn);
            } else {
                container.appendChild(row);
            }
        });
    }

    // ─── Get Final Config ────────────────────────────────────────
    function getConfig() {
        const botType = App.state.selectedBotType;
        const config = { bot_type: botType };

        const schemas = getFormSchemas();
        const schema = schemas[botType];
        if (!schema) return config;

        schema.fields.forEach(field => {
            if (field.type === 'menu_editor') {
                config.menu_items = _menuItems;
            } else if (field.type === 'services_editor') {
                config.services = _services;
            } else if (field.type === 'products_editor') {
                config.products = _products;
            } else {
                const el = document.getElementById(field.id);
                if (el) config[field.id] = el.value;
            }
        });

        return config;
    }

    // ─── Public API ──────────────────────────────────────────────
    return {
        setupConfigForm,
        getConfig,
        getMenuItems: () => _menuItems,
        getServices: () => _services,
        getProducts: () => _products,
    };
})();
