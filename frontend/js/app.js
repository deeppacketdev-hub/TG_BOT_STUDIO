/**
 * TG_BOT_STUDIO // CONSOLE_v2.0
 * Main Application Logic — Console UI Controller
 * Manages tabs, wizard state, status bar, console log, i18n, and API calls.
 */

const App = (() => {
    // ─── Application State ───────────────────────────────────────
    const state = {
        currentStep: 0,
        currentTab: 'builder',
        selectedBotType: null,
        botTypes: [],
        config: {},
        orderId: null,
        isPaid: false,
        startTime: Date.now(),
        logEntries: [],
    };

    // ─── DOM Helpers ─────────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ─── API Helper ──────────────────────────────────────────────
    async function api(endpoint, data = null) {
        const opts = {
            method: data ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
        };
        if (data) opts.body = JSON.stringify(data);

        const resp = await fetch(`/api/${endpoint}`, opts);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${resp.status}`);
        }

        const ct = resp.headers.get('content-type');
        if (ct && ct.includes('application/zip')) {
            return resp.blob();
        }
        return resp.json();
    }

    // ─── Console Log System ──────────────────────────────────────
    function consoleLog(message, level = 'info') {
        const now = new Date();
        const time = now.toTimeString().split(' ')[0];
        const entry = { time, level, message };
        state.logEntries.push(entry);

        const body = $('#consoleLogBody');
        if (body) {
            const el = document.createElement('div');
            el.className = 'log-entry';
            el.innerHTML = `
                <span class="log-time">${time}</span>
                <span class="log-level ${level}">[${level.toUpperCase()}]</span>
                <span class="log-msg">${message}</span>
            `;
            body.appendChild(el);
            body.scrollTop = body.scrollHeight;
        }
    }

    function toggleConsoleLog() {
        const panel = $('#consoleLogPanel');
        if (panel) {
            panel.classList.toggle('open');
        }
    }

    // ─── Toast Notifications ─────────────────────────────────────
    function showToast(message, type = 'info') {
        const container = $('#toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;

        container.appendChild(toast);
        consoleLog(message, type === 'error' ? 'error' : type === 'success' ? 'success' : 'info');

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ─── Loading Overlay ─────────────────────────────────────────
    function showLoading(text) {
        $('#loaderText').textContent = text || I18n.t('loading.default');
        $('#loadingOverlay').classList.add('active');
    }

    function hideLoading() {
        $('#loadingOverlay').classList.remove('active');
    }

    // ═══════════════════════════════════════════════════════════════
    //  TAB NAVIGATION
    // ═══════════════════════════════════════════════════════════════
    function switchTab(tabName) {
        $$('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        $$('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        const targetPanel = $(`[data-panel="${tabName}"]`);
        if (targetPanel) {
            void targetPanel.offsetWidth;
            targetPanel.classList.add('active');
        }

        state.currentTab = tabName;
        consoleLog(`Tab switched: ${tabName.toUpperCase()}`);

        // Auto-load analytics on first visit
        if (tabName === 'analytics' && typeof Analytics !== 'undefined') {
            Analytics.load();
        }
        // Auto-load instances on first visit
        if (tabName === 'instances' && typeof Instances !== 'undefined') {
            Instances.load();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  WIZARD STEP NAVIGATION
    // ═══════════════════════════════════════════════════════════════
    function goToStep(step) {
        const current = $(`.wizard-step.active`);
        if (current) current.classList.remove('active');

        const target = $(`#step${step}`);
        if (target) {
            target.classList.remove('active');
            void target.offsetWidth;
            target.classList.add('active');
        }

        $$('.builder-step-dot').forEach((dot, i) => {
            dot.classList.remove('active', 'completed');
            if (i < step) dot.classList.add('completed');
            if (i === step) dot.classList.add('active');
        });

        $$('.builder-step-line').forEach((line, i) => {
            line.classList.toggle('active', i < step);
        });

        state.currentStep = step;
        consoleLog(`Builder step: ${step + 1}/4`);

        if (step === 1) Wizard.setupConfigForm();
        if (step === 2) setupPaymentStep();
        if (step === 3) setupDownloadStep();
    }

    // ─── Payment Step ────────────────────────────────────────────
    function setupPaymentStep() {
        const typeInfo = state.botTypes.find(t => t.id === state.selectedBotType);
        if (typeInfo) {
            $('#paymentBotType').textContent = typeInfo.display;
        }
    }

    async function handlePayment() {
        showLoading(I18n.t('loading.processing'));
        consoleLog('Processing payment...', 'info');

        try {
            const order = await api('create-order', {
                bot_type: state.selectedBotType,
                amount: 299,
            });
            state.orderId = order.order_id;
            consoleLog(`Order created: ${order.order_id}`, 'success');

            await new Promise(r => setTimeout(r, 1500));

            const verify = await api('verify-payment', {
                order_id: state.orderId,
                payment_status: 'success',
            });

            if (verify.verified) {
                state.isPaid = true;
                consoleLog('Payment verified successfully', 'success');
                showToast(I18n.t('toast.paymentConfirmed'), 'success');
                goToStep(3);
            } else {
                consoleLog('Payment verification failed', 'error');
                showToast(I18n.t('toast.paymentError'), 'error');
            }
        } catch (err) {
            consoleLog(`Payment error: ${err.message}`, 'error');
            showToast(`${I18n.t('toast.error')}: ${err.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // ─── Download Step ───────────────────────────────────────────
    function setupDownloadStep() {
        // Success animation plays via CSS
    }

    async function handleDownload() {
        showLoading(I18n.t('loading.generating'));
        consoleLog('Generating bot package...', 'info');

        try {
            const config = Wizard.getConfig();
            // Pass current language to generator
            config.lang = I18n.getLang();

            const blob = await api('generate-bot', config);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${config.bot_name || 'telegram-bot'}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            consoleLog(`Bot package downloaded: ${a.download}`, 'success');
            showToast(I18n.t('toast.downloadSuccess'), 'success');

            const botsEl = $('#statusBots');
            if (botsEl) {
                botsEl.textContent = parseInt(botsEl.textContent) + 1;
            }
        } catch (err) {
            consoleLog(`Generation error: ${err.message}`, 'error');
            showToast(`${I18n.t('toast.genError')}: ${err.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // ─── Deploy Local — Auto-run on this device ────────────────
    async function handleDeployLocal() {
        const choiceGrid = document.querySelector('.deploy-choice-grid');
        const progressEl = $('#deployProgress');
        const logEl = $('#deployLog');
        const fillEl = $('#deployProgressFill');
        const statusEl = $('#deployStatusText');
        const resultEl = $('#deployResult');

        // Hide cards, show progress
        if (choiceGrid) choiceGrid.style.display = 'none';
        if (progressEl) progressEl.style.display = 'block';
        if (logEl) logEl.innerHTML = '';

        function addLog(text, type = 'info') {
            const line = document.createElement('div');
            line.className = `deploy-log-line ${type}`;
            const prefix = type === 'ok' ? '✓' : type === 'error' ? '✗' : '›';
            line.textContent = `${prefix} ${text}`;
            logEl.appendChild(line);
            logEl.scrollTop = logEl.scrollHeight;
            consoleLog(text, type === 'ok' ? 'success' : type);
        }

        function setProgress(pct) {
            if (fillEl) fillEl.style.width = pct + '%';
        }

        try {
            addLog('Initializing deploy sequence...');
            statusEl.textContent = 'GENERATING CODE...';
            setProgress(10);
            await new Promise(r => setTimeout(r, 400));

            addLog('Collecting configuration...');
            const config = Wizard.getConfig();
            config.lang = I18n.getLang();
            setProgress(20);
            await new Promise(r => setTimeout(r, 300));

            addLog('Generating bot source code...');
            statusEl.textContent = 'DEPLOYING...';
            setProgress(35);
            await new Promise(r => setTimeout(r, 200));

            addLog(`Bot type: ${config.bot_type}`);
            addLog(`Bot name: ${config.bot_name || 'unnamed'}`);
            setProgress(45);

            // Call deploy API
            addLog('Sending deploy request to server...');
            const resp = await fetch('/api/deploy-bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            const data = await resp.json();

            if (!resp.ok || data.error) {
                throw new Error(data.error || `HTTP ${resp.status}`);
            }

            setProgress(65);
            addLog(`Deployed to: ${data.deploy.path}`, 'ok');
            addLog(`Files extracted: ${data.deploy.files.length}`, 'ok');

            if (data.deploy.install_log) {
                addLog('Installing dependencies...');
                statusEl.textContent = 'INSTALLING DEPS...';
                setProgress(80);
                await new Promise(r => setTimeout(r, 500));
                addLog('Dependencies installed', 'ok');
            }

            setProgress(90);
            statusEl.textContent = 'STARTING BOT...';
            addLog('Starting bot process...');
            await new Promise(r => setTimeout(r, 400));

            if (data.start && data.start.success) {
                setProgress(100);
                addLog(`Bot started! PID: ${data.start.pid}`, 'ok');
                addLog(`Status: ONLINE`, 'ok');
                statusEl.textContent = '✅ DEPLOY COMPLETE';

                const botsEl = $('#statusBots');
                if (botsEl) {
                    botsEl.textContent = parseInt(botsEl.textContent || '0') + 1;
                }

                showToast('🚀 Бот розгорнутий та запущений!', 'success');

                // Show result after a moment
                await new Promise(r => setTimeout(r, 800));
                if (resultEl) {
                    resultEl.style.display = 'block';
                    $('#deployResultText').textContent = `Бот #${data.bot_id} запущений (PID: ${data.start.pid})`;
                }
            } else {
                setProgress(100);
                const errMsg = data.start?.error || 'Unknown start error';
                addLog(`Start warning: ${errMsg}`, 'error');
                statusEl.textContent = '⚠️ DEPLOYED (NOT STARTED)';
                showToast(`Deployed but not started: ${errMsg}`, 'error');

                if (resultEl) {
                    resultEl.style.display = 'block';
                    $('#deployResultText').textContent = `Бот розгорнутий, але не запущений: ${errMsg}`;
                }
            }
        } catch (err) {
            addLog(`DEPLOY FAILED: ${err.message}`, 'error');
            statusEl.textContent = '❌ DEPLOY FAILED';
            setProgress(100);
            showToast(`Deploy error: ${err.message}`, 'error');
        }
    }

    let _tokenTimeout = null;
    async function validateToken(token) {
        if (_tokenTimeout) clearTimeout(_tokenTimeout);

        _tokenTimeout = setTimeout(async () => {
            const statusEl = $('#tokenStatus');
            if (!statusEl) return;

            if (!token || !token.includes(':')) {
                statusEl.className = 'token-status';
                statusEl.textContent = '';
                statusEl.style.display = 'none';
                return;
            }

            statusEl.style.display = 'flex';
            statusEl.className = 'token-status';
            statusEl.textContent = I18n.t('token.checking');
            consoleLog(`Validating token: ${token.substring(0, 8)}...`, 'info');

            try {
                const result = await api('validate-token', { token });
                if (result.valid) {
                    statusEl.className = 'token-status valid';
                    statusEl.textContent = `${I18n.t('token.valid')}: @${result.bot.username}`;
                    state.config.bot_token = token;
                    consoleLog(`Token valid: @${result.bot.username}`, 'success');

                    if (result.bot.first_name) {
                        $('#tgBotName').textContent = result.bot.first_name;
                    }
                }
            } catch {
                statusEl.className = 'token-status invalid';
                statusEl.textContent = I18n.t('token.invalid');
                consoleLog('Token validation failed', 'warn');
            }
        }, 600);
    }

    // ═══════════════════════════════════════════════════════════════
    //  STATUS BAR — Live Indicators
    // ═══════════════════════════════════════════════════════════════
    function startStatusBar() {
        setInterval(() => {
            const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
            const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
            const s = String(elapsed % 60).padStart(2, '0');
            const uptimeEl = $('#statusUptime');
            if (uptimeEl) uptimeEl.textContent = `${h}:${m}:${s}`;
        }, 1000);

        setInterval(() => {
            const latency = Math.floor(8 + Math.random() * 18);
            const latencyEl = $('#statusLatency');
            if (latencyEl) latencyEl.textContent = `${latency}ms`;
        }, 3000);
    }

    // ═══════════════════════════════════════════════════════════════
    //  LANGUAGE SWITCHER — Full i18n Integration
    // ═══════════════════════════════════════════════════════════════
    function setupLanguageSwitcher() {
        $$('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                I18n.setLanguage(lang);
                consoleLog(`Language changed: ${lang.toUpperCase()}`, 'info');

                // Re-render bot type cards with translated text
                renderBotTypes();

                // Re-render wizard form if on step 1
                if (state.currentStep === 1 && state.selectedBotType) {
                    Wizard.setupConfigForm();
                }

                // Re-render simulator if on step 1
                if (state.currentStep === 1 && typeof Simulator !== 'undefined') {
                    Simulator.update(state.selectedBotType, Wizard.getConfig());
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    //  INIT
    // ═══════════════════════════════════════════════════════════════
    async function init() {
        // Initialize i18n first
        I18n.init();

        consoleLog('TG_BOT_STUDIO // CONSOLE_v2.0 initialized', 'success');
        consoleLog(`Language: ${I18n.getLang().toUpperCase()}`, 'info');
        consoleLog('Loading bot types...', 'info');

        // Load bot types
        try {
            const data = await api('bot-types');
            state.botTypes = data.types;
            consoleLog(`Loaded ${data.types.length} bot types`, 'success');
            renderBotTypes();
        } catch {
            // Fallback — use i18n for display names
            state.botTypes = [
                { id: 'menu', display: I18n.t('botType.menu.display'), description: I18n.t('botType.menu.desc') },
                { id: 'feedback', display: I18n.t('botType.feedback.display'), description: I18n.t('botType.feedback.desc') },
                { id: 'leadgen', display: I18n.t('botType.leadgen.display'), description: I18n.t('botType.leadgen.desc') },
                { id: 'ai_assistant', display: I18n.t('botType.ai_assistant.display'), description: I18n.t('botType.ai_assistant.desc') },
                { id: 'catalog', display: I18n.t('botType.catalog.display'), description: I18n.t('botType.catalog.desc') },
            ];
            consoleLog('Using fallback bot types (5)', 'warn');
            renderBotTypes();
        }

        // ─── Bind Tab Navigation ────────────────────────────────
        $$('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                switchTab(btn.dataset.tab);
            });
        });

        // ─── Bind Wizard Navigation ─────────────────────────────
        $('#btnBack1')?.addEventListener('click', () => goToStep(0));
        $('#btnBack2')?.addEventListener('click', () => goToStep(1));
        $('#btnNext1')?.addEventListener('click', () => goToStep(2));
        $('#btnPay')?.addEventListener('click', handlePayment);
        $('#btnDownload')?.addEventListener('click', handleDownload);
        $('#btnDeployLocal')?.addEventListener('click', handleDeployLocal);
        $('#btnCreateAnother')?.addEventListener('click', () => {
            state.selectedBotType = null;
            state.config = {};
            state.orderId = null;
            state.isPaid = false;
            // Reset deploy UI
            const choiceGrid = document.querySelector('.deploy-choice-grid');
            const progress = $('#deployProgress');
            const result = $('#deployResult');
            if (choiceGrid) choiceGrid.style.display = '';
            if (progress) progress.style.display = 'none';
            if (result) result.style.display = 'none';
            goToStep(0);
            consoleLog('Builder reset — new session', 'info');
        });
        $('#btnGoToInstances')?.addEventListener('click', () => {
            switchTab('analytics');
        });

        // ─── Console Log Panel ──────────────────────────────────
        $('#btnConsoleLog')?.addEventListener('click', toggleConsoleLog);
        $('#btnCloseLog')?.addEventListener('click', toggleConsoleLog);

        // ─── Language Switcher ──────────────────────────────────
        setupLanguageSwitcher();

        // ─── Card Glow Effect ───────────────────────────────────
        document.addEventListener('mousemove', (e) => {
            document.querySelectorAll('.bot-type-card').forEach(card => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                card.style.setProperty('--my', `${e.clientY - rect.top}px`);
            });
        });

        // ─── Start Status Bar ───────────────────────────────────
        startStatusBar();

        // ─── PWA Service Worker ─────────────────────────────────
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }

        consoleLog('All systems operational', 'success');
    }

    // ─── Render Bot Type Cards ───────────────────────────────────
    function renderBotTypes() {
        const grid = $('#botTypeGrid');
        grid.innerHTML = '';

        const badges = { ai_assistant: 'ТОП', catalog: 'HIT', stars_shop: 'NEW' };

        // Use i18n for card content
        const types = [
            { id: 'menu', displayKey: 'botType.menu.display', descKey: 'botType.menu.desc' },
            { id: 'feedback', displayKey: 'botType.feedback.display', descKey: 'botType.feedback.desc' },
            { id: 'leadgen', displayKey: 'botType.leadgen.display', descKey: 'botType.leadgen.desc' },
            { id: 'ai_assistant', displayKey: 'botType.ai_assistant.display', descKey: 'botType.ai_assistant.desc' },
            { id: 'catalog', displayKey: 'botType.catalog.display', descKey: 'botType.catalog.desc' },
            { id: 'stars_shop', displayKey: 'botType.stars_shop.display', descKey: 'botType.stars_shop.desc' },
        ];

        types.forEach(type => {
            const card = document.createElement('div');
            card.className = 'bot-type-card';
            card.dataset.type = type.id;
            if (state.selectedBotType === type.id) card.classList.add('selected');

            const display = I18n.t(type.displayKey);
            const desc = I18n.t(type.descKey);
            const emoji = display.split(' ')[0];
            const title = display.replace(emoji, '').trim();

            card.innerHTML = `
                <span class="card-emoji">${emoji}</span>
                <div class="card-title">${title}</div>
                <div class="card-desc">${desc}</div>
                ${badges[type.id] ? `<span class="card-badge">${badges[type.id]}</span>` : ''}
            `;

            card.addEventListener('click', () => {
                $$('.bot-type-card.selected').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                state.selectedBotType = type.id;
                consoleLog(`Bot type selected: ${type.id}`, 'info');

                setTimeout(() => goToStep(1), 300);
            });

            grid.appendChild(card);
        });
    }

    // ─── Public API ──────────────────────────────────────────────
    return {
        init,
        state,
        goToStep,
        switchTab,
        showToast,
        showLoading,
        hideLoading,
        validateToken,
        consoleLog,
        api,
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
