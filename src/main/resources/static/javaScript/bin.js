/* ═══════════════════════════════════════════════════════════════════
   INFERA — bin.js
   Recycle bin modals. Loaded by the sidebar fragment, so every page with a sidebar has it.
     · 'global'    modal (lives in the sidebar fragment): my personal bin, opened from the sidebar item
     · 'workspace' modal (notes + workspaces pages): one workspace's bin, with a workspace selector
   The panel is server-rendered HTML. Restore buttons are normal POST forms: the page reloads with the
   toast, then a short-lived flag reopens the same bin so several items can be restored in a row.
═══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    if (!window.bootstrap) return;

    const REOPEN_KEY = 'binReopen';

    function initBin(modalEl) {
        const mode   = modalEl.dataset.binMode;                      // 'workspace' | 'global'
        const bodyEl = modalEl.querySelector('[data-bin-body]');
        const select = modalEl.querySelector('[data-bin-select]');   // workspace mode only
        const modal  = new bootstrap.Modal(modalEl);
        let requestId = 0;   // lets a slow response be ignored after the workspace changed or the modal closed

        function setMessage(text, isError) {
            const box = document.createElement('div');
            box.className = 'bin-state' + (isError ? ' error' : '');
            box.textContent = text;                                   // textContent: never HTML
            bodyEl.replaceChildren(box);
        }

        function panelUrl() {
            if (mode === 'global') return '/bin/panel';
            return select && select.value ? `/bin/workspace/${encodeURIComponent(select.value)}/panel` : null;
        }

        async function load() {
            const url = panelUrl();
            if (!url) { setMessage('No workspace to show.', true); return; }
            const my = ++requestId;
            setMessage('Loading…', false);
            try {
                const res = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
                if (my !== requestId) return;
                if (res.redirected) { setMessage('Your session may have expired. Reload the page.', true); return; }
                if (!res.ok)        { setMessage('Could not load the bin. Try again.', true); return; }
                const html = await res.text();
                if (my !== requestId) return;
                bodyEl.innerHTML = html;                              // server-rendered, already escaped by Thymeleaf
            } catch (err) {
                if (my === requestId) setMessage('Network problem. Check your connection and try again.', true);
            }
        }

        // Workspace mode: start on the workspace of the notes page's active filter pill, else the first one
        function preselect(preferredId) {
            if (!select) return;
            const has = v => v && [...select.options].some(o => o.value === String(v));
            let wanted = preferredId;
            if (!has(wanted)) {
                try { wanted = sessionStorage.getItem('notesActiveFilter'); } catch (e) { wanted = null; }
            }
            if (has(wanted)) select.value = String(wanted);
        }

        function open(preferredId) {
            preselect(preferredId);
            modal.show();
            load();
        }

        document.querySelectorAll(`[data-bin-open="${mode}"]`).forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                if (typeof closeSidebar === 'function') closeSidebar();   // mobile: slide the sidebar away first
                open();
            });
        });
        select?.addEventListener('change', load);

        // Restore forms are injected after page load, so listen on the container
        bodyEl.addEventListener('submit', e => {
            const form = e.target.closest('form');
            if (!form) return;
            const back = form.querySelector('input[name="returnTo"]');
            if (back) back.value = window.location.pathname;          // come back to THIS page (the server whitelists it)
            bodyEl.querySelectorAll('button[type="submit"]').forEach(b => { b.disabled = true; });   // no double restore
            try {
                sessionStorage.setItem(REOPEN_KEY, JSON.stringify({
                    mode, workspaceId: select ? select.value : null, t: Date.now()
                }));
            } catch (err) { /* storage blocked: restore still works, the bin just won't reopen */ }
        });

        modalEl.addEventListener('hidden.bs.modal', () => { requestId++; bodyEl.replaceChildren(); });

        return { open };
    }

    const bins = {};
    document.querySelectorAll('[data-bin-mode]').forEach(el => { bins[el.dataset.binMode] = initBin(el); });

    // Reopen right after a restore redirect (the flag is consumed once and expires after 15 s)
    try {
        const raw = sessionStorage.getItem(REOPEN_KEY);
        sessionStorage.removeItem(REOPEN_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            if (bins[saved.mode] && Date.now() - saved.t < 15000) bins[saved.mode].open(saved.workspaceId);
        }
    } catch (err) { /* ignore a corrupt flag */ }
})();