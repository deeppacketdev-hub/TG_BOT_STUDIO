/**
 * TG Bot Builder — Active Instances Dashboard
 * Manages deployed bots: start, stop, export ZIP, status monitoring.
 */

const Instances = (() => {
    const $ = (sel) => document.querySelector(sel);

    let _loaded = false;

    async function load() {
        const panel = $('#panelInstances');
        if (!panel) return;

        try {
            const [botsResp, runningResp] = await Promise.all([
                fetch('/api/bots').then(r => r.json()),
                fetch('/api/bots/running').then(r => r.json()),
            ]);

            const bots = botsResp.bots || [];
            const running = new Set(runningResp.running || []);

            render(panel, bots, running);
            _loaded = true;
        } catch (err) {
            panel.innerHTML = `<div class="registry-empty">
                <div class="empty-icon">⚠️</div>
                <div class="empty-text">Error loading instances</div>
                <div class="empty-hint">${err.message}</div>
            </div>`;
        }
    }

    function render(panel, bots, running) {
        if (bots.length === 0) {
            panel.innerHTML = `
                <div class="instances-dashboard">
                    <div class="registry-empty">
                        <div class="empty-icon">🤖</div>
                        <div class="empty-text">${I18n.t('instances.empty')}</div>
                        <div class="empty-hint">${I18n.t('instances.emptyHint')}</div>
                    </div>
                </div>`;
            return;
        }

        const cards = bots.map(bot => {
            const isRunning = running.has(bot.id);
            const isDeployed = bot.status === 'ONLINE' || isRunning;
            const deployMode = isRunning ? 'local' : 'zip';
            const statusClass = isRunning ? 'online' : 'standby';
            const statusText = isRunning ? 'ONLINE' : 'STANDBY';

            const typeBadge = getTypeBadge(bot.bot_type);
            const modeBadge = deployMode === 'local'
                ? `<span class="deploy-mode-badge mode-local">🖥️ LOCAL</span>`
                : `<span class="deploy-mode-badge mode-zip">📦 ZIP</span>`;

            const date = new Date(bot.created_at * 1000).toLocaleDateString('uk-UA');

            // Action buttons
            let actions = '';
            if (isRunning) {
                actions += `<button class="btn-instance btn-stop" data-id="${bot.id}" title="Stop">⏹ STOP</button>`;
                actions += `<button class="btn-instance btn-export" data-id="${bot.id}" title="Export ZIP">📦 ZIP</button>`;
            } else {
                // Check if deployed locally
                actions += `<button class="btn-instance btn-start" data-id="${bot.id}" title="Start">▶ START</button>`;
            }

            return `
                <div class="instance-card ${statusClass}" data-bot-id="${bot.id}">
                    <div class="instance-header">
                        <div class="instance-status">
                            <span class="status-dot-lg ${statusClass}"></span>
                            <span class="instance-status-text ${statusClass}">${statusText}</span>
                        </div>
                        ${modeBadge}
                    </div>
                    <div class="instance-info">
                        <div class="instance-name">${bot.name}</div>
                        <div class="instance-meta">
                            ${typeBadge}
                            ${bot.link ? `<a href="${bot.link}" target="_blank" class="bot-link">@${bot.username || 'bot'}</a>` : ''}
                        </div>
                    </div>
                    <div class="instance-stats">
                        <div class="instance-stat">
                            <span class="stat-value stars-count">${bot.total_stars_earned || 0}</span>
                            <span class="stat-label">⭐ STARS</span>
                        </div>
                        <div class="instance-stat">
                            <span class="stat-value">${bot.active_users || 0}</span>
                            <span class="stat-label">👥 USERS</span>
                        </div>
                        <div class="instance-stat">
                            <span class="stat-value">${date}</span>
                            <span class="stat-label">📅 CREATED</span>
                        </div>
                    </div>
                    <div class="instance-actions">
                        ${actions}
                        <button class="btn-instance btn-delete" data-id="${bot.id}" title="Delete">🗑</button>
                    </div>
                </div>`;
        }).join('');

        panel.innerHTML = `
            <div class="instances-dashboard">
                <div class="terminal-line">
                    <span class="terminal-prompt">root@tg-console:~$</span>
                    <span class="terminal-cmd">docker ps --format "table {{.ID}}\\t{{.Names}}\\t{{.Status}}"</span>
                </div>
                <div class="instances-grid">
                    ${cards}
                </div>
                <div class="analytics-actions">
                    <button class="btn-console" id="btnRefreshInstances">↻ ${I18n.t('analytics.refresh')}</button>
                </div>
            </div>`;

        // Bind events
        bindEvents(panel);
    }

    function bindEvents(panel) {
        // Start
        panel.querySelectorAll('.btn-start').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                btn.disabled = true;
                btn.textContent = '⏳...';
                try {
                    const resp = await fetch(`/api/bots/${id}/start`, { method: 'POST' });
                    const data = await resp.json();
                    if (data.success) {
                        showToast(`Bot #${id} started (PID: ${data.pid})`, 'success');
                    } else {
                        showToast(data.error || 'Start failed', 'error');
                    }
                } catch (e) {
                    showToast(`Error: ${e.message}`, 'error');
                }
                load(); // Refresh
            });
        });

        // Stop
        panel.querySelectorAll('.btn-stop').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                btn.disabled = true;
                btn.textContent = '⏳...';
                try {
                    await fetch(`/api/bots/${id}/stop`, { method: 'POST' });
                    showToast(`Bot #${id} stopped`, 'info');
                } catch (e) {
                    showToast(`Error: ${e.message}`, 'error');
                }
                load();
            });
        });

        // Export ZIP
        panel.querySelectorAll('.btn-export').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                btn.disabled = true;
                btn.textContent = '⏳...';
                try {
                    const resp = await fetch(`/api/bots/${id}/export-zip`);
                    if (!resp.ok) throw new Error('Export failed');
                    const blob = await resp.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bot-${id}-export.zip`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast(`Bot #${id} exported as ZIP`, 'success');
                } catch (e) {
                    showToast(`Export error: ${e.message}`, 'error');
                }
                btn.disabled = false;
                btn.textContent = '📦 ZIP';
            });
        });

        // Delete
        panel.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (!confirm('Delete this bot?')) return;
                try {
                    // Stop first if running
                    await fetch(`/api/bots/${id}/stop`, { method: 'POST' });
                    await fetch(`/api/bots/${id}`, { method: 'DELETE' });
                    showToast(`Bot #${id} deleted`, 'info');
                } catch (e) {
                    showToast(`Error: ${e.message}`, 'error');
                }
                load();
            });
        });

        // Refresh
        panel.querySelector('#btnRefreshInstances')?.addEventListener('click', load);
    }

    function getTypeBadge(type) {
        const map = {
            'stars_shop': ['STARS', 'badge-gold'],
            'menu': ['MENU', 'badge-blue'],
            'feedback': ['FEEDBACK', 'badge-purple'],
            'leadgen': ['LEADGEN', 'badge-cyan'],
            'ai_assistant': ['AI', 'badge-green'],
            'catalog': ['CATALOG', 'badge-amber'],
        };
        const [label, cls] = map[type] || [type.toUpperCase(), 'badge-default'];
        return `<span class="type-badge ${cls}">[${label}]</span>`;
    }

    function showToast(msg, type) {
        if (typeof App !== 'undefined' && App.showToast) {
            App.showToast(msg, type);
        }
    }

    return { load };
})();
