/**
 * TG Bot Builder — Interactive Telegram Simulator
 * Renders a live preview of the bot inside a phone frame.
 * All simulator text uses I18n.t() for trilingual support.
 */

const Simulator = (() => {
    const $ = (sel) => document.querySelector(sel);

    // ─── Render Chat Messages ────────────────────────────────────
    function clearChat() {
        const chat = $('#tgChat');
        if (chat) chat.innerHTML = '';
    }

    function addMessage(text, type = 'bot', buttons = []) {
        const chat = $('#tgChat');
        if (!chat) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `tg-message ${type}`;

        const formattedText = text.replace(/\\n/g, '\n').replace(/\n/g, '<br>');
        msgDiv.innerHTML = formattedText;

        if (buttons.length > 0) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'tg-buttons';

            buttons.forEach(btn => {
                const btnEl = document.createElement('button');
                btnEl.className = 'tg-inline-btn';
                btnEl.textContent = btn.label;
                btnEl.addEventListener('click', () => {
                    handleButtonClick(btn);
                });
                btnContainer.appendChild(btnEl);
            });

            msgDiv.appendChild(btnContainer);
        }

        chat.appendChild(msgDiv);
        chat.scrollTop = chat.scrollHeight;
    }

    function addTyping() {
        const chat = $('#tgChat');
        if (!chat) return;

        const typing = document.createElement('div');
        typing.className = 'tg-typing';
        typing.id = 'typingIndicator';
        typing.innerHTML = '<span></span><span></span><span></span>';
        chat.appendChild(typing);
        chat.scrollTop = chat.scrollHeight;

        return typing;
    }

    function removeTyping() {
        const typing = $('#typingIndicator');
        if (typing) typing.remove();
    }

    // ─── Simulate Button Click ───────────────────────────────────
    function handleButtonClick(btn) {
        const botType = App.state.selectedBotType;

        // Stars-specific actions
        if (btn.action === 'stars_buy' && btn.productData) {
            const prod = btn.productData;
            addMessage(`${prod.title} — ${prod.price} ⭐`, 'user');

            const typing = addTyping();
            setTimeout(() => {
                removeTyping();
                const emoji = prod.type === 'file' ? '📄' : '🔗';
                const cardText = `${emoji} <b>${prod.title}</b>\n\n${prod.description || ''}\n\n💫 ${I18n.t('sim.stars.payBtn')} <b>${prod.price} ⭐ Stars</b>`;
                addMessage(cardText, 'bot', [
                    { label: `💳 ${I18n.t('sim.stars.payBtn')} ${prod.price} ⭐`, action: 'stars_confirm_pay', productData: prod },
                    { label: I18n.t('sim.stars.backCatalog'), action: 'back_main' },
                ]);
            }, 600);
            return;
        }

        if (btn.action === 'stars_confirm_pay' && btn.productData) {
            const prod = btn.productData;
            addMessage(`${I18n.t('sim.stars.payConfirm')} (${prod.price} ⭐)`, 'user');

            const typing = addTyping();
            setTimeout(() => {
                removeTyping();
                addMessage(`${I18n.t('sim.stars.payDialog')}\n\n🧾 <b>${prod.title}</b>\n💰 ${prod.price} ⭐ Stars\n\n⏳ ...`, 'bot');

                setTimeout(() => {
                    const deliveryEmoji = prod.type === 'file' ? '📄' : '🔗';
                    const content = prod.content || (prod.type === 'file' ? 'document.pdf' : 'https://t.me/+SECRET');
                    addMessage(
                        `${I18n.t('sim.stars.paySuccess')}\n\n${I18n.t('sim.stars.payDelivered')}\n${deliveryEmoji} <b>${prod.title}</b>\n\n${prod.type === 'link' ? content : `📎 ${content}`}`,
                        'bot',
                        [{ label: I18n.t('sim.stars.backCatalog'), action: 'back_main' }]
                    );
                }, 1500);
            }, 800);
            return;
        }

        if (btn.action === 'stars_history') {
            addMessage(I18n.t('sim.stars.myPurchases'), 'user');
            const typing = addTyping();
            setTimeout(() => {
                removeTyping();
                addMessage('📋 <b>' + I18n.t('sim.stars.myPurchases') + '</b>\n\n—', 'bot', [
                    { label: I18n.t('sim.stars.backCatalog'), action: 'back_main' },
                ]);
            }, 600);
            return;
        }

        // Default actions
        addMessage(btn.label, 'user');

        const typing = addTyping();

        setTimeout(() => {
            removeTyping();

            if (btn.text) {
                addMessage(btn.text, 'bot', [
                    { label: I18n.t('sim.backToMain'), action: 'back_main' }
                ]);
            } else if (btn.action === 'back_main') {
                updatePreview(botType);
            }
        }, 600);
    }

    // ─── Update Preview Per Bot Type ─────────────────────────────
    function updatePreview(botType) {
        clearChat();

        switch (botType) {
            case 'menu':
                renderMenuPreview();
                break;
            case 'feedback':
                renderFeedbackPreview();
                break;
            case 'leadgen':
                renderLeadgenPreview();
                break;
            case 'ai_assistant':
                renderAIPreview();
                break;
            case 'catalog':
                renderCatalogPreview();
                break;
            case 'stars_shop':
                renderStarsShopPreview();
                break;
            default:
                addMessage(I18n.t('sim.defaultPreview'), 'bot');
        }
    }

    // ─── Update (for language switch re-render) ──────────────────
    function update(botType, config) {
        updatePreview(botType);
    }

    // ─── Menu Bot Preview ────────────────────────────────────────
    function renderMenuPreview() {
        const welcomeEl = $('#welcome_text');
        const welcome = welcomeEl ? welcomeEl.value : I18n.t('default.menu.welcome');
        const menuItems = Wizard.getMenuItems();

        const buttons = menuItems.map(item => ({
            label: item.label,
            text: item.text,
        }));

        addMessage(welcome, 'bot', buttons);
    }

    // ─── Feedback Bot Preview ────────────────────────────────────
    function renderFeedbackPreview() {
        const welcomeEl = $('#welcome_text');
        const welcome = welcomeEl ? welcomeEl.value : I18n.t('default.feedback.welcome');

        addMessage(welcome, 'bot');

        setTimeout(() => {
            addMessage(I18n.t('sim.feedback.userMsg'), 'user');

            setTimeout(() => {
                const typing = addTyping();
                setTimeout(() => {
                    removeTyping();
                    addMessage(I18n.t('sim.feedback.response'), 'bot');
                }, 1000);
            }, 800);
        }, 1000);
    }

    // ─── Leadgen Bot Preview ─────────────────────────────────────
    function renderLeadgenPreview() {
        const welcomeEl = $('#welcome_text');
        const welcome = welcomeEl ? welcomeEl.value : I18n.t('default.leadgen.welcome');

        addMessage(welcome, 'bot');

        setTimeout(() => {
            addMessage(I18n.t('sim.leadgen.askName'), 'bot');

            setTimeout(() => {
                addMessage(I18n.t('sim.leadgen.userName'), 'user');

                setTimeout(() => {
                    addMessage(I18n.t('sim.leadgen.askPhone'), 'bot', [
                        { label: I18n.t('sim.leadgen.sharePhone'), text: null, action: 'share_phone' },
                    ]);

                    setTimeout(() => {
                        addMessage('+380991234567', 'user');

                        setTimeout(() => {
                            const services = Wizard.getServices();
                            if (services && services.length > 0) {
                                const svcButtons = services.map(s => ({
                                    label: s,
                                    text: null,
                                    action: 'select_service',
                                }));
                                addMessage(I18n.t('sim.leadgen.selectService'), 'bot', svcButtons);
                            }
                        }, 600);
                    }, 800);
                }, 600);
            }, 800);
        }, 500);
    }

    // ─── AI Assistant Preview ────────────────────────────────────
    function renderAIPreview() {
        const welcomeEl = $('#welcome_text');
        const welcome = welcomeEl ? welcomeEl.value : I18n.t('default.ai.welcome');

        addMessage(welcome, 'bot');

        setTimeout(() => {
            addMessage(I18n.t('sim.ai.userMsg'), 'user');

            setTimeout(() => {
                const typing = addTyping();
                setTimeout(() => {
                    removeTyping();
                    addMessage(I18n.t('sim.ai.response'), 'bot');
                }, 2000);
            }, 800);
        }, 1000);
    }

    // ─── Catalog Bot Preview ─────────────────────────────────────
    function renderCatalogPreview() {
        const welcomeEl = $('#welcome_text');
        const welcome = welcomeEl ? welcomeEl.value : I18n.t('default.catalog.welcome');

        addMessage(welcome, 'bot', [
            { label: I18n.t('sim.catalog.electronics'), text: null, action: 'show_cat' },
            { label: I18n.t('sim.catalog.accessories'), text: null, action: 'show_cat' },
            { label: I18n.t('sim.catalog.cart'), text: null, action: 'show_cart' },
        ]);
    }

    // ─── Stars Shop Preview ─────────────────────────────────────
    function renderStarsShopPreview() {
        const welcomeEl = $('#welcome_text');
        const welcome = welcomeEl ? welcomeEl.value : I18n.t('default.stars.welcome');

        let products = [];
        try {
            products = Wizard.getProducts();
        } catch (e) {
            const defaults = I18n.t('default.stars.products');
            if (Array.isArray(defaults)) products = defaults;
        }

        if (!products || products.length === 0) {
            addMessage(welcome, 'bot');
            return;
        }

        const buttons = products.map(prod => {
            const emoji = prod.type === 'file' ? '📄' : '🔗';
            return {
                label: `${emoji} ${prod.title} — ${prod.price} ⭐`,
                action: 'stars_buy',
                productData: prod,
            };
        });

        buttons.push({
            label: I18n.t('sim.stars.myPurchases'),
            action: 'stars_history',
        });

        addMessage(welcome, 'bot', buttons);
    }

    // ─── Public API ──────────────────────────────────────────────
    return {
        updatePreview,
        update,
        clearChat,
        addMessage,
    };
})();
