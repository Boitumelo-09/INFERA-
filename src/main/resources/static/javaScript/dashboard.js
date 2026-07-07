/* ═══════════════════════════════════════════════════════════════════
   INFERA — dashboard.js
   Covers:
     · Sidebar toggle (mobile)
     · Greeting (time-aware) + live date
     · Stat counter animation
     · Activity bar chart (JS-rendered)
     · Global search modal (⌘K / Ctrl+K)
     · Search results with keyboard navigation
     · New Workspace modal + colour picker
     · Quick Note modal
     · Panel "View all" / nav routing (SPA-style stub)
     · Toast notification system
     · Note row + workspace card click feedback
     · Topbar active-link highlight on scroll (future sections)
     · Responsive sidebar overlay
═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ───────────────────────────────────────────────────────────────────
   UTILITIES
─────────────────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function showToast(msg, type = 'success') {
    const toast    = $('#inferaToast');
    const toastMsg = $('#toastMsg');
    const toastIcon = $('#toastIcon');
    if (!toast) return;

    toastMsg.textContent = msg;
    toastIcon.className  = 'toast-icon' + (type === 'error' ? ' error' : '');
    toastIcon.innerHTML  = type === 'error'
        ? '<i class="bi bi-exclamation-circle"></i>'
        : '<i class="bi bi-check2-circle"></i>';

    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function setLoading(btn, isLoading) {
    const txt  = btn.querySelector('.btn-text, .btn-submit-text');
    const spin = btn.querySelector('.btn-spin, .btn-submit-spinner');
    if (!txt || !spin) return;
    btn.disabled = isLoading;
    txt.classList.toggle('d-none', isLoading);
    spin.classList.toggle('d-none', !isLoading);
}
// ─── CUSTOM CURSOR ───────────────────────
const dot  = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top  = mouseY + 'px';
});
(function animateRing() {
    ringX += (mouseX - ringX) * 0.14;
    ringY += (mouseY - ringY) * 0.14;
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';
    requestAnimationFrame(animateRing);
})();

document.querySelectorAll('a, button, input, label').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});
document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });

/* ───────────────────────────────────────────────────────────────────
   SIDEBAR TOGGLE  (mobile)
─────────────────────────────────────────────────────────────────── */
const sidebar        = $('#sidebar');
const sidebarToggle  = $('#sidebarToggle');
const sidebarClose   = $('#sidebarClose');
const sidebarOverlay = $('#sidebarOverlay');

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

/* Close sidebar on nav-item click on mobile */
$$('.nav-item, .nav-item-btn').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth < 992) closeSidebar();
    });
});

/* ───────────────────────────────────────────────────────────────────
   GREETING  — time-aware + live date
─────────────────────────────────────────────────────────────────── */
function initGreeting() {
    const greetingEl = $('#greetingText');
    const dateEl     = $('#greetingDate');
    if (!greetingEl && !dateEl) return;

    const hour = new Date().getHours();
    let period = 'morning';
    if (hour >= 12 && hour < 17) period = 'afternoon';
    else if (hour >= 17)         period = 'evening';

    /* In Thymeleaf, th:text handles the name. Here we keep the static
       text but swap just the time-of-day portion for the demo. */
    if (greetingEl) {
        const current = greetingEl.textContent;
        greetingEl.textContent = current.replace(
            /^Good \w+/,
            `Good ${period}`
        );
    }

    if (dateEl) {
        function updateDate() {
            const now  = new Date();
            const day  = now.toLocaleDateString('en-ZA', { weekday: 'long' });
            const date = now.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
            const time = now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit',second: '2-digit' });
            dateEl.innerHTML = `${day}<br>${date}<br><span style="color:var(--accent);font-weight:600;">${time}</span>`;
        }
        updateDate();
        setInterval(updateDate, 1);
    }
}

/* ───────────────────────────────────────────────────────────────────
   STAT COUNTER ANIMATION
─────────────────────────────────────────────────────────────────── */
function animateCounters() {
    const cards = $$('.sc-value[data-count]');
    if (!cards.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el     = entry.target;
            const target = parseInt(el.dataset.count, 10);
            const duration = 900;
            const start    = performance.now();

            function step(now) {
                const elapsed  = now - start;
                const progress = Math.min(elapsed / duration, 1);
                // ease-out-quart
                const eased = 1 - Math.pow(1 - progress, 4);
                el.textContent = Math.round(eased * target);
                if (progress < 1) requestAnimationFrame(step);
                else el.textContent = target;
            }

            requestAnimationFrame(step);
            observer.unobserve(el);
        });
    }, { threshold: 0.3 });

    cards.forEach(el => observer.observe(el));
}

/* ───────────────────────────────────────────────────────────────────
   ACTIVITY BAR CHART
   In real Thymeleaf app: th:data-values="${weeklyData}" on #activityBars
   carries a JSON string like "[0,3,1,4,2,0,1]"
─────────────────────────────────────────────────────────────────── */
function buildActivityBars() {
    const container = $('#activityBars');
    if (!container) return;

    /* Demo data — replace with th:data-values in Thymeleaf */
    const raw = container.dataset.values;
    const values = raw
        ? JSON.parse(raw)
        : [1, 3, 0, 4, 2, 1, 3];   /* Mon–Sun demo counts */

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const max  = Math.max(...values, 1);

    container.innerHTML = '';

    values.forEach((val, i) => {
        const heightPct = val === 0 ? 6 : Math.max(10, (val / max) * 100);

        const wrap = document.createElement('div');
        wrap.className = 'act-bar-wrap';
        wrap.setAttribute('title', `${days[i]}: ${val} note${val !== 1 ? 's' : ''}`);

        const bar = document.createElement('div');
        bar.className = 'act-bar' + (val > 0 ? ' has-data' : '');
        /* Animate in on load */
        bar.style.height   = '0%';
        bar.style.transition = `height 0.6s cubic-bezier(0.34,1.2,0.64,1) ${i * 60}ms`;

        wrap.appendChild(bar);
        container.appendChild(wrap);

        /* Trigger after paint */
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.height = heightPct + '%';
            });
        });
    });
}

/* ───────────────────────────────────────────────────────────────────
   SEARCH MODAL
─────────────────────────────────────────────────────────────────── */

/* Sample data — in a real Spring app this would be fetched via
   GET /api/search?q=... and return JSON. Replace searchLocal()
   with a fetch() call pointing to your Spring controller.        */
const SEARCH_SAMPLE = [
    { type: 'note',     title: 'Spring Security Config',      meta: 'Java Backend · #security',  id: 1  },
    { type: 'note',     title: 'JPA Repository Patterns',     meta: 'Java Backend · #jpa',       id: 2  },
    { type: 'note',     title: 'REST API Design Notes',       meta: 'Java Backend · #api',       id: 3  },
    { type: 'note',     title: 'Thesis Literature Review',    meta: 'Research · #thesis',        id: 4  },
    { type: 'note',     title: 'Interview Prep — Java Q&A',  meta: 'Career · #interview',       id: 5  },
    { type: 'note',     title: 'Music Theory Basics',         meta: 'Music · #theory',           id: 6  },
    { type: 'ws',       title: 'Java Backend',                meta: '12 notes · 4 resources',    id: 1  },
    { type: 'ws',       title: 'Research',                    meta: '6 notes · 3 resources',     id: 2  },
    { type: 'ws',       title: 'Career',                      meta: '4 notes · 2 resources',     id: 3  },
    { type: 'resource', title: 'docs.spring.io/security',     meta: 'Java Backend · Documentation', id: 1 },
    { type: 'resource', title: 'hibernate.org/orm/docs',      meta: 'Java Backend · Docs',       id: 2  },
    { type: 'resource', title: 'Effective Java — summary',    meta: 'Research · Book',           id: 3  },
];

const ICON_MAP = { note: 'bi-journal-text', ws: 'bi-folder2-open', resource: 'bi-link-45deg' };
const TYPE_LABEL = { note: 'Note', ws: 'Workspace', resource: 'Resource' };

function searchLocal(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return SEARCH_SAMPLE
        .filter(item =>
            item.title.toLowerCase().includes(q) ||
            item.meta.toLowerCase().includes(q)
        )
        .slice(0, 8);
}

const searchModal   = $('#searchModal');
const searchInput   = $('#searchInput');
const searchResults = $('#searchResults');

let focusedIdx = -1;

function openSearch() {
    if (!searchModal) return;
    searchModal.removeAttribute('hidden');
    searchInput?.focus();
    focusedIdx = -1;
    renderSearchHint();
}

function closeSearch() {
    if (!searchModal) return;
    searchModal.setAttribute('hidden', '');
    if (searchInput) searchInput.value = '';
    renderSearchHint();
}

function renderSearchHint() {
    if (!searchResults) return;
    searchResults.innerHTML = `
    <div class="search-hint">
      <i class="bi bi-lightning-charge"></i>
      Type to search across all your workspaces
    </div>`;
}

function renderSearchResults(items) {
    if (!searchResults) return;
    if (!items.length) {
        searchResults.innerHTML = `
      <div class="search-hint">
        <i class="bi bi-slash-circle"></i> No results found
      </div>`;
        return;
    }

    searchResults.innerHTML = items.map((item, i) => `
    <div class="search-result-item" data-idx="${i}" data-type="${item.type}" data-id="${item.id}" role="option">
      <div class="sri-icon ${item.type}">
        <i class="bi ${ICON_MAP[item.type]}"></i>
      </div>
      <div class="sri-body">
        <div class="sri-title">${escapeHtml(item.title)}</div>
        <div class="sri-meta">${escapeHtml(item.meta)}</div>
      </div>
      <span class="sri-type">${TYPE_LABEL[item.type]}</span>
    </div>
  `).join('');

    /* Click on result */
    $$('.search-result-item', searchResults).forEach(el => {
        el.addEventListener('click', () => {
            const type = el.dataset.type;
            const id   = el.dataset.id;
            closeSearch();
            handleSearchSelect(type, id, el.querySelector('.sri-title')?.textContent);
        });
    });
}

function handleSearchSelect(type, id, title) {
    /* In Thymeleaf app, redirect to the relevant controller route:
       note      → /notes/{id}
       ws        → /workspaces/{id}
       resource  → /resources/{id}      */
    showToast(`Opening ${title}`);
}

function moveFocus(direction) {
    const items = $$('.search-result-item', searchResults);
    if (!items.length) return;
    items[focusedIdx]?.classList.remove('focused');
    focusedIdx = (focusedIdx + direction + items.length) % items.length;
    items[focusedIdx]?.classList.add('focused');
    items[focusedIdx]?.scrollIntoView({ block: 'nearest' });
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* Open triggers */
$('#searchTrigger')?.addEventListener('click', openSearch);
$('#topbarSearch')?.addEventListener('click', openSearch);
$('#searchBackdrop')?.addEventListener('click', closeSearch);

/* Keyboard shortcut ⌘K / Ctrl+K */
document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchModal?.hasAttribute('hidden') ? openSearch() : closeSearch();
    }
    if (!searchModal?.hasAttribute('hidden')) {
        if (e.key === 'Escape') closeSearch();
        if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); }
        if (e.key === 'Enter') {
            const focused = $('.search-result-item.focused', searchResults);
            focused?.click();
        }
    }
});

/* Debounced search input */
let searchTimer;
searchInput?.addEventListener('input', () => {
    focusedIdx = -1;
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();
    if (!q) { renderSearchHint(); return; }
    searchTimer = setTimeout(() => {
        /* REAL APP: replace with fetch('/search?q=' + encodeURIComponent(q))
           .then(r => r.json()).then(renderSearchResults)                    */
        renderSearchResults(searchLocal(q));
    }, 180);
});

/* ───────────────────────────────────────────────────────────────────
   NEW WORKSPACE MODAL
─────────────────────────────────────────────────────────────────── */
const newWorkspaceModal = new bootstrap.Modal('#newWorkspaceModal', { backdrop: true });
const newWorkspaceForm  = $('#newWorkspaceForm');
const wsColorInput      = $('#wsColor');

/* Open from sidebar button */
$('#newWorkspaceBtn')?.addEventListener('click', () => {
    newWorkspaceModal.show();
});

/* Colour picker */
$$('.cp-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        $$('.cp-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        if (wsColorInput) wsColorInput.value = swatch.dataset.color;
    });
});

/* Form submit */
newWorkspaceForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const nameInput = $('#wsName');
    const name      = nameInput?.value.trim();
    if (!name) {
        nameInput?.focus();
        nameInput?.style.setProperty('border-color', '#ef4444');
        return;
    }
    nameInput?.style.removeProperty('border-color');

    const btn = $('#wsSubmitBtn');
    setLoading(btn, true);

    /* ── THYMELEAF INTEGRATION ─────────────────────────────────────
       Replace the setTimeout below with a real fetch / form submit:

       const form = newWorkspaceForm;
       const data = new FormData(form);
       await fetch(form.action || '/workspaces', {
         method: 'POST',
         headers: { 'X-CSRF-TOKEN': document.querySelector('[name=_csrf]')?.value },
         body: data
       });

       Then redirect or update the sidebar workspace list.
    ──────────────────────────────────────────────────────────────── */
    await fakeDelay(1200);

    const color = wsColorInput?.value || '#ea580c';
    addWorkspaceToSidebar(name, color);

    setLoading(btn, false);
    newWorkspaceModal.hide();
    newWorkspaceForm.reset();
    $$('.cp-swatch').forEach((s, i) => s.classList.toggle('active', i === 0));
    if (wsColorInput) wsColorInput.value = '#ea580c';

    showToast(`Workspace "${name}" created`);
});

function addWorkspaceToSidebar(name, color) {
    const list    = $('#workspaceList');
    const newBtn  = $('#newWorkspaceBtn')?.closest('li');
    if (!list) return;

    const li = document.createElement('li');
    li.innerHTML = `
    <a href="#" class="nav-item ws-item" data-workspace="new">
      <span class="ws-dot" style="--ws-color:${color};"></span>
      <span>${escapeHtml(name)}</span>
    </a>`;

    list.insertBefore(li, newBtn);

    /* Highlight briefly */
    const link = li.querySelector('.nav-item');
    link.style.background = `${color}22`;
    setTimeout(() => link.style.background = '', 1800);
}

/* ───────────────────────────────────────────────────────────────────
   QUICK NOTE MODAL
─────────────────────────────────────────────────────────────────── */
const quickNoteModal = new bootstrap.Modal('#quickNoteModal', { backdrop: true });
const quickNoteForm  = $('#quickNoteForm');

$('#quickNoteBtn')?.addEventListener('click', () => {
    quickNoteModal.show();
    setTimeout(() => $('#noteTitle')?.focus(), 300);
});

quickNoteForm?.addEventListener('submit', async e => {
    e.preventDefault();

    const title   = $('#noteTitle')?.value.trim();
    const content = $('#noteContent')?.value.trim();

    if (!title) {
        $('#noteTitle')?.focus();
        return;
    }

    const btn = $('#noteSubmitBtn');
    setLoading(btn, true);

    /* ── THYMELEAF INTEGRATION ─────────────────────────────────────
       const form = quickNoteForm;
       const data = new FormData(form);
       const res  = await fetch('/notes', {
         method: 'POST',
         headers: { 'X-CSRF-TOKEN': document.querySelector('[name=_csrf]')?.value },
         body: data
       });
       if (res.ok) { ... }
    ──────────────────────────────────────────────────────────────── */
    await fakeDelay(1000);

    /* Prepend to recent notes list (demo only — real app re-renders via Thymeleaf) */
    prependNoteRow(title);
    updateBadgeCount('navNotesBadge', 1);

    setLoading(btn, false);
    quickNoteModal.hide();
    quickNoteForm.reset();

    showToast(`Note "${title}" saved`);
});

function prependNoteRow(title) {
    const list = $('.panel-body', $('.dash-panel'));   /* first panel = recent notes */
    if (!list) return;

    const row = document.createElement('div');
    row.className = 'note-row';
    row.style.cssText = 'opacity:0; transform:translateY(-8px); transition: opacity 0.35s, transform 0.35s;';
    row.innerHTML = `
    <div class="note-row-left">
      <div class="note-ws-dot" style="--ws-color:var(--accent);"></div>
      <div>
        <div class="note-row-title">${escapeHtml(title)}</div>
        <div class="note-row-meta">Just now</div>
      </div>
    </div>
    <div class="note-row-date">now</div>`;

    list.prepend(row);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            row.style.opacity   = '1';
            row.style.transform = 'none';
        });
    });

    /* Remove last row if list gets too long (keeps it to 5) */
    const rows = $$('.note-row', list);
    if (rows.length > 5) rows[rows.length - 1].remove();
}

/* ───────────────────────────────────────────────────────────────────
   BADGE COUNT HELPERS
─────────────────────────────────────────────────────────────────── */
function updateBadgeCount(badgeId, delta) {
    const el = $(`#${badgeId}`);
    if (!el) return;
    const current = parseInt(el.textContent, 10) || 0;
    el.textContent = current + delta;
    /* Pulse animation */
    el.style.transform = 'scale(1.4)';
    el.style.transition = 'transform 0.15s';
    setTimeout(() => { el.style.transform = ''; }, 200);
}

/* ───────────────────────────────────────────────────────────────────
   NAV ROUTING STUBS
   In a real Thymeleaf app these links are <a href="/workspaces"> etc.
   This JS only handles the demo highlight behaviour.
─────────────────────────────────────────────────────────────────── */
function setActiveNav(page) {
    $$('.nav-item[data-page]').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    const breadcrumb = $('#breadcrumbPage');
    if (breadcrumb && page) {
        breadcrumb.textContent = page.charAt(0).toUpperCase() + page.slice(1);
    }
}

$$('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', e => {
        e.preventDefault();
        setActiveNav(el.dataset.page);
        if (window.innerWidth < 992) closeSidebar();
        /* Real app: window.location.href = '/' + el.dataset.page; */
    });
});

/* "View all" / panel actions */
$$('.panel-action[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
        setActiveNav(btn.dataset.page);
        /* Real app: window.location.href = '/' + btn.dataset.page; */
        showToast(`Navigating to ${btn.dataset.page}…`);
    });
});

/* ───────────────────────────────────────────────────────────────────
   NOTE ROW CLICK
─────────────────────────────────────────────────────────────────── */
$$('.note-row[data-note-id]').forEach(row => {
    row.addEventListener('click', () => {
        const id = row.dataset.noteId;
        const title = row.querySelector('.note-row-title')?.textContent;
        /* Real app: window.location.href = '/notes/' + id; */
        showToast(`Opening: ${title}`);
    });
});

/* ───────────────────────────────────────────────────────────────────
   WORKSPACE CARD CLICK
─────────────────────────────────────────────────────────────────── */
$$('.ws-card[data-workspace]').forEach(card => {
    card.addEventListener('click', () => {
        const id   = card.dataset.workspace;
        const name = card.querySelector('.ws-card-name')?.textContent;
        /* Real app: window.location.href = '/workspaces/' + id; */
        showToast(`Opening workspace: ${name}`);
    });
});

/* ───────────────────────────────────────────────────────────────────
   TOPBAR AVATAR  — stub for future dropdown
─────────────────────────────────────────────────────────────────── */
$('#topbarAvatar')?.addEventListener('click', () => {
    /* Real app: open profile dropdown / navigate to /profile */
    showToast('Profile settings coming soon');
});

$('#notifBtn')?.addEventListener('click', () => {
    showToast('No new notifications');
    /* Remove dot after first click */
    $('.notif-dot')?.remove();
});

/* ───────────────────────────────────────────────────────────────────
   KEYBOARD SHORTCUTS  (dashboard-level)
─────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
    /* Skip if user is typing in an input */
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    switch (e.key) {
        case 'n':
        case 'N':
            /* N = quick new note */
            if (!e.metaKey && !e.ctrlKey) {
                quickNoteModal.show();
                setTimeout(() => $('#noteTitle')?.focus(), 300);
            }
            break;
        case 'w':
        case 'W':
            /* W = new workspace */
            if (!e.metaKey && !e.ctrlKey) {
                newWorkspaceModal.show();
            }
            break;
    }
});

/* ───────────────────────────────────────────────────────────────────
   SIDEBAR SEARCH  (also triggers modal)
─────────────────────────────────────────────────────────────────── */
$('#searchTrigger')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openSearch();
    }
});

/* ───────────────────────────────────────────────────────────────────
   FORM INPUT FOCUS STYLES
─────────────────────────────────────────────────────────────────── */
$$('.form-input').forEach(input => {
    const group = input.closest('.form-group');
    const label = group?.querySelector('.form-label-custom');

    input.addEventListener('focus', () => {
        if (label) label.style.color = 'var(--accent)';
    });
    input.addEventListener('blur', () => {
        if (label) label.style.color = '';
    });
});

/* ───────────────────────────────────────────────────────────────────
   RESIZE HANDLER — reopen sidebar if resizing back to desktop
─────────────────────────────────────────────────────────────────── */
window.addEventListener('resize', () => {
    if (window.innerWidth >= 992) {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}, { passive: true });

/* ───────────────────────────────────────────────────────────────────
   HELPER — fake async delay (remove in production)
─────────────────────────────────────────────────────────────────── */
function fakeDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* ───────────────────────────────────────────────────────────────────
   INIT
─────────────────────────────────────────────────────────────────── */
function init() {
    initGreeting();
    animateCounters();
    buildActivityBars();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
