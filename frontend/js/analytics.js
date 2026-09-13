/**
 * TG Bot Builder — Analytics Hub Module
 * Manages the analytics dashboard: HUD widgets, bot registry table, and Stars sync.
 * All text uses I18n.t() for trilingual support.
 */

const Analytics = (() => {
    const $ = (sel) => document.querySelector(sel);

    let _loaded = false;
    let _bots = [];
    let _summary = {};

    // ─── Load Analytics Data ────────────────────────────────────
    async function load() {
        try {
            const [summaryResp, botsResp] = await Promise.all([
                fetch('/api/analytics/summary').then(r => r.json()),
                fetch('/api/bots').then(r => r.json()),
            ]);

            _summary = summaryResp;
            _bots = botsResp.bots || [];
            _loaded = true;

            render();
            App.consoleLog(`Analytics loaded: ${_bots.length} bots, ${_summary.total_stars} ⭐`, 'success');
        } catch (e) {
            App.consoleLog(`Analytics load error: ${e.message}`, 'error');
            renderError();
        }
    }

    // ─── Render Full Dashboard ──────────────────────────────────
    function render() {
        const panel = $('#panelAnalytics');
        if (!panel) return;

        const stars = _summary.total_stars || 0;
        const totalBots = _summary.total_bots || 0;
        const transactions = _summary.total_transactions || 0;
        const onlineBots = _summary.online_bots || 0;

        panel.innerHTML = `
            <div class="analytics-dashboard">
                <!-- HUD Widgets -->
                <div class="analytics-hud">
                    <div class="hud-widget hud-stars">
                        <div class="hud-icon">⭐</div>
                        <div class="hud-content">
                            <div class="hud-value" id="hudStars">${formatNumber(stars)}</div>
                            <div class="hud-label">TOTAL REVENUE (STARS)</div>
                        </div>
                    </div>
                    <div class="hud-widget hud-bots">
                        <div class="hud-icon">🤖</div>
                        <div class="hud-content">
                            <div class="hud-value">${totalBots}</div>
                            <div class="hud-label">BOTS DEPLOYED</div>
                        </div>
                    </div>
                    <div class="hud-widget hud-transactions">
                        <div class="hud-icon">📊</div>
                        <div class="hud-content">
                            <div class="hud-value">${transactions}</div>
                            <div class="hud-label">TOTAL TRANSACTIONS</div>
                        </div>
                    </div>
                    <div class="hud-widget hud-online">
                        <div class="hud-icon">🟢</div>
                        <div class="hud-content">
                            <div class="hud-value">${onlineBots}</div>
                            <div class="hud-label">ONLINE NOW</div>
                        </div>
                    </div>
                </div>

                <!-- Terminal Command -->
                <div class="terminal-line">
                    <span class="terminal-prompt">root@tg-console:~$</span>
                    <span class="terminal-cmd">SELECT * FROM bots ORDER BY created_at DESC;</span>
                </div>

                <!-- Bot Registry Table -->
                <div class="registry-table-wrap">
                    ${renderBotsTable()}
                </div>

                <!-- Actions -->
                <div class="analytics-actions">
                    <button class="btn-console" id="btnRefreshAnalytics">
                        ↻ ${I18n.t('analytics.refresh')}
                    </button>
                </div>
            </div>
        `;

        // Bind refresh
        $('#btnRefreshAnalytics')?.addEventListener('click', () => {
            App.consoleLog('Refreshing analytics...', 'info');
            load();
        });

        // Bind action buttons
        panel.querySelectorAll('.btn-sync-stars').forEach(btn => {
            btn.addEventListener('click', () => syncStars(parseInt(btn.dataset.botId)));
        });

        panel.querySelectorAll('.btn-delete-bot').forEach(btn => {
            btn.addEventListener('click', () => deleteBot(parseInt(btn.dataset.botId)));
        });

        panel.querySelectorAll('.btn-copy-link').forEach(btn => {
            btn.addEventListener('click', () => {
                const link = btn.dataset.link;
                navigator.clipboard.writeText(link).then(() => {
                    App.showToast('Link copied!');
                });
            });
        });

        // Update status bar bot count
        const statusBots = document.getElementById('statusBots');
        if (statusBots) statusBots.textContent = totalBots;
    }

    // ─── Render Bots Table ──────────────────────────────────────
    function renderBotsTable() {
        if (_bots.length === 0) {
            return `
                <div class="registry-empty">
                    <div class="empty-icon">📭</div>
                    <div class="empty-text">${I18n.t('analytics.noBots')}</div>
                    <div class="empty-hint">${I18n.t('analytics.noBotsHint')}</div>
                </div>
            `;
        }

        const typeBadges = {
            menu: { label: 'MENU', cls: 'badge-blue' },
            feedback: { label: 'FEEDBACK', cls: 'badge-purple' },
            leadgen: { label: 'LEADGEN', cls: 'badge-cyan' },
            ai_assistant: { label: 'AI', cls: 'badge-amber' },
            catalog: { label: 'CATALOG', cls: 'badge-green' },
            stars_shop: { label: 'STARS', cls: 'badge-gold' },
        };

        const rows = _bots.map(bot => {
            const badge = typeBadges[bot.bot_type] || { label: bot.bot_type.toUpperCase(), cls: 'badge-default' };
            const date = new Date(bot.created_at * 1000).toLocaleDateString();
            const statusClass = bot.status === 'ONLINE' ? 'status-online' : 'status-standby';
            const link = bot.link || `t.me/${bot.username || '...'}`;
            const hasLink = bot.link && bot.link.length > 5;

            return `
                <tr class="registry-row">
                    <td class="col-id">#${bot.id}</td>
                    <td class="col-name">
                        <span class="bot-name-text">${escapeHtml(bot.name)}</span>
                        <span class="type-badge ${badge.cls}">[${badge.label}]</span>
                    </td>
                    <td class="col-link">
                        ${hasLink
                            ? `<a href="${bot.link}" target="_blank" class="bot-link">${bot.link}</a>
                               <button class="btn-icon btn-copy-link" data-link="${bot.link}" title="Copy">📋</button>`
                            : `<span class="text-muted">—</span>`
                        }
                    </td>
                    <td class="col-stars">
                        <span class="stars-count">${formatNumber(bot.total_stars_earned)}</span> ⭐
                    </td>
                    <td class="col-status">
                        <span class="status-dot-sm ${statusClass}"></span>
                        <span class="${statusClass}">${bot.status}</span>
                    </td>
                    <td class="col-date">${date}</td>
                    <td class="col-actions">
                        <button class="btn-icon btn-sync-stars" data-bot-id="${bot.id}" title="${I18n.t('analytics.syncStars')}">⭐+</button>
                        <button class="btn-icon btn-delete-bot" data-bot-id="${bot.id}" title="${I18n.t('analytics.delete')}">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <table class="registry-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>${I18n.t('analytics.colName')}</th>
                        <th>${I18n.t('analytics.colLink')}</th>
                        <th>STARS ⭐</th>
                        <th>${I18n.t('analytics.colStatus')}</th>
                        <th>${I18n.t('analytics.colDate')}</th>
                        <th>${I18n.t('analytics.colActions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    // ─── Sync Stars (Test Transaction) ──────────────────────────
    async function syncStars(botId) {
        try {
            const resp = await fetch('/api/bots/sync-stars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bot_id: botId,
                    amount: Math.floor(Math.random() * 200) + 10,
                    item_title: 'Test Purchase',
                    user_tg_id: `user_${Math.floor(Math.random() * 99999)}`,
                }),
            });

            const data = await resp.json();
            if (data.success) {
                App.consoleLog(`Stars synced for bot #${botId}: new total = ${data.new_total} ⭐`, 'success');
                App.showToast(`+Stars → Bot #${botId}`);
                load(); // Refresh
            }
        } catch (e) {
            App.consoleLog(`Sync error: ${e.message}`, 'error');
        }
    }

    // ─── Delete Bot ─────────────────────────────────────────────
    async function deleteBot(botId) {
        try {
            const resp = await fetch(`/api/bots/${botId}`, { method: 'DELETE' });
            const data = await resp.json();
            if (data.success) {
                App.consoleLog(`Bot #${botId} deleted from registry`, 'warn');
                App.showToast(`Bot #${botId} deleted`);
                load();
            }
        } catch (e) {
            App.consoleLog(`Delete error: ${e.message}`, 'error');
        }
    }

    // ─── Render Error State ─────────────────────────────────────
    function renderError() {
        const panel = $('#panelAnalytics');
        if (!panel) return;

        panel.innerHTML = `
            <div class="panel-placeholder">
                <div class="placeholder-icon">⚠️</div>
                <div class="placeholder-title">CONNECTION_ERROR</div>
                <p class="placeholder-text">Failed to load analytics data. Server may be unavailable.</p>
                <button class="btn-console" id="btnRetryAnalytics">↻ Retry</button>
            </div>
        `;

        $('#btnRetryAnalytics')?.addEventListener('click', load);
    }

    // ─── Helpers ────────────────────────────────────────────────
    function formatNumber(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return String(n);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── Public API ─────────────────────────────────────────────
    return {
        load,
        render,
        isLoaded: () => _loaded,
    };
})();
