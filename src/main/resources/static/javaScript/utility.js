/* ───────────────────────────────────────────────────────────────────
   SHARED HELPER
─────────────────────────────────────────────────────────────────── */
/* ───────────────────────────────────────────────────────────────────
   SIDEBAR TOGGLE  (mobile)
─────────────────────────────────────────────────────────────────── */
const sidebar        = $('#sidebar');
const sidebarToggle  = $('#sidebarToggle');
const sidebarClose   = $('#sidebarClose');
const sidebarOverlay = $('#sidebarOverlay');

const sidebarCollapseBtn = $('#sidebarCollapseBtn');
if (localStorage.getItem('sidebarCollapsed') === 'true') sidebar.classList.add('collapsed');
requestAnimationFrame(() => document.documentElement.classList.remove('no-sb-transition'));
sidebarCollapseBtn?.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    document.documentElement.classList.toggle('sb-collapsed', isCollapsed);
    localStorage.setItem('sidebarCollapsed', isCollapsed);
});
function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

sidebarToggle?.addEventListener('click', openSidebar);
sidebarClose?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);



(function () {
    'use strict';
    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    const ICON_MAP   = { note: 'bi-journal-text', workspace: 'bi-folder2-open', resource: 'bi-link-45deg' };
    const TYPE_LABEL = { note: 'Note', workspace: 'Workspace', resource: 'Resource' };

    const searchModal     = $('#searchModal');
    const searchInputEl   = $('#searchInput');
    const searchResultsEl = $('#searchResults');
    let focusedIdx = -1;

    function escapeHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    async function searchRemote(query) {
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            return res.ok ? await res.json() : [];
        } catch { return []; }
    }

    function openSearch() {
        searchModal?.removeAttribute('hidden');
        searchInputEl?.focus();
        focusedIdx = -1;
        renderHint();
    }
    function closeSearch() {
        searchModal?.setAttribute('hidden', '');
        if (searchInputEl) searchInputEl.value = '';
        renderHint();
    }
    function renderHint() {
        if (searchResultsEl) searchResultsEl.innerHTML = `<div class="search-hint"><i class="bi bi-lightning-charge"></i> Type to search across all your workspaces</div>`;
    }
    function renderResults(items) {
        if (!searchResultsEl) return;
        if (!items.length) {
            searchResultsEl.innerHTML = `<div class="search-hint"><i class="bi bi-slash-circle"></i> No results found</div>`;
            return;
        }
        searchResultsEl.innerHTML = items.map((item, i) => `
            <div class="search-result-item" data-idx="${i}" data-type="${item.type}" data-id="${item.id}" role="option">
                <div class="sri-icon ${item.type}"><i class="bi ${ICON_MAP[item.type]}"></i></div>
                <div class="sri-body">
                    <div class="sri-title">${escapeHtml(item.title)}</div>
                    <div class="sri-meta">${escapeHtml(item.meta)}</div>
                </div>
                <span class="sri-type">${TYPE_LABEL[item.type]}</span>
            </div>
        `).join('');
        $$('.search-result-item', searchResultsEl).forEach(el => {
            el.addEventListener('click', () => handleSelect(el.dataset.type, el.dataset.id));
        });
    }
    function handleSelect(type, id) {
        if (type === 'note' || type === 'resource') window.location.href = `/notes?view=${id}`;
        else if (type === 'workspace') window.location.href = `/workspaces`;
    }
    function moveFocus(direction) {
        const items = $$('.search-result-item', searchResultsEl);
        if (!items.length) return;
        items[focusedIdx]?.classList.remove('focused');
        focusedIdx = (focusedIdx + direction + items.length) % items.length;
        items[focusedIdx]?.classList.add('focused');
        items[focusedIdx]?.scrollIntoView({ block: 'nearest' });
    }

    $('#searchTrigger')?.addEventListener('click', openSearch);
    $('#topbarSearch')?.addEventListener('click', openSearch);
    $('#searchBackdrop')?.addEventListener('click', closeSearch);

    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchModal?.hasAttribute('hidden') ? openSearch() : closeSearch();
        }
        if (!searchModal?.hasAttribute('hidden')) {
            if (e.key === 'Escape') closeSearch();
            if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); }
            if (e.key === 'Enter') $('.search-result-item.focused', searchResultsEl)?.click();
        }
    });

    let debounceTimer;
    searchInputEl?.addEventListener('input', () => {
        focusedIdx = -1;
        clearTimeout(debounceTimer);
        const q = searchInputEl.value.trim();
        if (!q) { renderHint(); return; }
        debounceTimer = setTimeout(async () => renderResults(await searchRemote(q)), 180);
    });
})();


void function (){
    const buttons = document.querySelectorAll('.topbar-avatar,.topbar-avatar-img');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            window.location.href = '/profile';

        });
    })
}();





