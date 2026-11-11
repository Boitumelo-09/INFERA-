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
     · Soft page-transition navigation (workspace tiles/sidebar/panel)
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


/* ───────────────────────────────────────────────────────────────────
   SOFT PAGE NAVIGATION
   Fades the current page out before navigating, instead of the
   abrupt jump cut of a normal link click or redirect. The arriving
   page fades back IN on load via 'pageshow' (also covers the
   browser's back/forward cache, not just fresh loads).

   Requires this in dashboard.css:
     body { opacity: 1; transition: opacity .28s ease; }
     body.page-transitioning { opacity: 0; pointer-events: none; }
─────────────────────────────────────────────────────────────────── */
function softNavigate(url) {
    document.body.classList.add('page-transitioning');
    setTimeout(() => { window.location.href = url; }, 240);
}

window.addEventListener('pageshow', () => {
    document.body.classList.remove('page-transitioning');
});

/* Close sidebar on nav-item click on mobile */
$$('.nav-item, .nav-item-btn').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth < 992) closeSidebar();
    });
});

/* Sidebar workspace links (Workspaces section) soft-navigate to Notes,
   pre-filtered to that workspace — href already carries ?workspace={id}
   from th:href="@{/notes(workspace=${ws.id})}" in the template */
$$('#workspaceList .ws-item').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        softNavigate(link.href);
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
    let period = 'Morning';
    if (hour >= 12 && hour < 17) period = 'Afternoon';
    else if (hour >= 17)         period = 'Evening';

    if (greetingEl) {
        const current = greetingEl.textContent;
        greetingEl.textContent = current.replace(
            /^Good \w+/,
            `${period}`
        );
    }

    if (dateEl) {
        function updateDate() {
            const now  = new Date();
            const day  = now.toLocaleDateString('en-ZA', { weekday: 'long' });
            const date = now.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
            const time = now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            dateEl.innerHTML = `${day}<br>${date}<br><span font-weight:600;">${time}</span>`;
        }
        updateDate();
        setInterval(updateDate, 1000);
    }
}
// let k = document.getElementById("greetingText");
// if (k) k.style.color = "var(--accent)";

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
    const wrap = $('#activityChartWrap');
    const svg  = $('#activityChartSvg');
    const tooltip = $('#chartTooltip');
    if (!wrap || !svg) return;

    const raw = wrap.dataset.values;
    const values = raw ? JSON.parse(raw) : [1, 3, 0, 4, 2, 1, 3];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const W = 700, H = 160, padTop = 20, padBottom = 24;
    const chartH = H - padTop - padBottom;
    const max = Math.max(...values, 1);
    const stepX = (W - 40) / (values.length - 1);

    const points = values.map((v, i) => ({
        x: 20 + i * stepX,
        y: padTop + chartH - (v / max) * chartH,
        v, day: days[i]
    }));

    // Catmull-Rom → smooth bezier path
    function smoothPath(pts) {
        if (pts.length < 2) return '';
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i - 1] || pts[i];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[i + 2] || p2;
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return d;
    }

    const linePath = smoothPath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${H - padBottom} L ${points[0].x} ${H - padBottom} Z`;

    const gridLines = [0.25, 0.5, 0.75].map(f =>
        `<line class="chart-grid-line" x1="20" x2="${W - 20}" y1="${padTop + chartH * f}" y2="${padTop + chartH * f}" />`
    ).join('');

    svg.innerHTML = `
        <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35" />
                <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
            </linearGradient>
        </defs>
        ${gridLines}
        <path class="chart-area" d="${areaPath}" fill="url(#chartFill)" stroke="none" />
        <path class="chart-line" id="chartLinePath" d="${linePath}" />
        ${points.map((p, i) => `<circle class="chart-point" data-idx="${i}" cx="${p.x}" cy="${p.y}" r="4"></circle>`).join('')}
    `;

    // Animate the line drawing in
    const linePathEl = $('#chartLinePath');
    const length = linePathEl.getTotalLength();
    linePathEl.style.strokeDasharray = length;
    linePathEl.style.strokeDashoffset = length;
    requestAnimationFrame(() => {
        linePathEl.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)';
        linePathEl.style.strokeDashoffset = 0;
    });

    // Hover tooltip
    $$('.chart-point', svg).forEach(circle => {
        circle.addEventListener('mouseenter', () => {
            const p = points[circle.dataset.idx];
            tooltip.innerHTML = `<span class="tt-day">${p.day}</span> · ${p.v} ${p.v === 1 ? 'event' : 'events'}`;

            const wrapWidth = wrap.getBoundingClientRect().width;
            const pxPosition = (p.x / W) * wrapWidth;
            const tooltipWidth = tooltip.offsetWidth || 90;
            const halfTooltip = tooltipWidth / 2;

            const clampedPx = Math.min(Math.max(pxPosition, halfTooltip), wrapWidth - halfTooltip);
            tooltip.style.left = clampedPx + 'px';
            tooltip.style.transform = `translate(-50%, -100%)`;
            tooltip.classList.add('show');
        });
        circle.addEventListener('mouseleave', () => tooltip.classList.remove('show'));
    });}

/* ───────────────────────────────────────────────────────────────────
   NEW WORKSPACE MODAL
─────────────────────────────────────────────────────────────────── */
// const newWorkspaceModal = new bootstrap.Modal('#newWorkspaceModal', { backdrop: true });
const newWorkspaceForm  = $('#newWorkspaceForm');
const wsColorInput      = $('#wsColor');
const newWorkspaceModalEl = document.getElementById('newWorkspaceModal');
const newWorkspaceModal = newWorkspaceModalEl
    ? new bootstrap.Modal(newWorkspaceModalEl, { backdrop: true })
    : null
/* Open from sidebar button */
$('#newWorkspaceBtn')?.addEventListener('click', () => {
    newWorkspaceModal?.show();
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
newWorkspaceForm?.addEventListener('submit', e => {
    const nameInput = $('#wsName');
    const name = nameInput?.value.trim();

    if (!name) {
        e.preventDefault();               // only block if invalid
        nameInput?.focus();
        nameInput?.style.setProperty('border-color', '#ef4444');
        // NOTE: removed window.location.reload() that used to be here —
        // reloading on a failed validation wipes the open modal and
        // anything else the user typed. We just block submission and
        // let them fix the field in place instead.
    }
    // if valid, do nothing — browser submits the form to th:action="@{/workspaces}"
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

        setActiveNav(el.dataset.page);
        if (window.innerWidth < 992) closeSidebar();
        /* Real app: window.location.href = '/' + el.dataset.page; */
    });
});

/* "View all" / panel actions — soft-navigate to the target page
   instead of an instant hard redirect */
$$('.panel-action[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
        setActiveNav(btn.dataset.page);
        softNavigate('/' + btn.dataset.page);
    });
});

/* ───────────────────────────────────────────────────────────────────
   NOTE ROW CLICK
─────────────────────────────────────────────────────────────────── */
$$('.note-row[data-note-id]').forEach(row => {
    row.addEventListener('click', () => {
        const id = row.dataset.noteId;
        softNavigate(`/notes?view=${id}`);
    });
})

/* ───────────────────────────────────────────────────────────────────
   WORKSPACE CARD CLICK
   Same story as the tiles on /workspaces and the sidebar links above —
   clicking a workspace card takes you to Notes, pre-filtered to
   just that workspace, with the same soft fade transition.
─────────────────────────────────────────────────────────────────── */
$$('.ws-card[data-workspace]').forEach(card => {
    card.addEventListener('click', () => {
        const id = card.dataset.workspace;
        softNavigate(`/notes?workspace=${id}`);
    });
});

/* ───────────────────────────────────────────────────────────────────
   TOPBAR AVATAR  — stub for future dropdown
─────────────────────────────────────────────────────────────────── */

$('#notifBtn')?.addEventListener('click', () => {
    showToast('Belmire - INCAPTUR v2.0.0 Coming Soon...');
    /* Remove dot after first click */
    $('.notif-dot')?.remove();
});
// Select the element (e.g., your navigation bar)
const header = document.getElementById('topbar')
// Define the scroll threshold in pixels
const scrollThreshold = 50;

function handleScroll() {
    if (!header) return;
    // Check how far the page has been scrolled vertically
    if (window.scrollY > scrollThreshold) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

// Listen for the scroll event
window.addEventListener('scroll', handleScroll);

// Optional: Run immediately on load in case the page starts already scrolled
handleScroll();


/* ───────────────────────────────────────────────────────────────────
   KEYBOARD SHORTCUTS  (dashboard-level)
─────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
    /* Skip if user is typing in an input */
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    switch (e.key) {
        case 'w':
        case 'W':
            /* W = new workspace */
            if (!e.metaKey && !e.ctrlKey) {
                newWorkspaceModal?.show();
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
   INIT
─────────────────────────────────────────────────────────────────── */
function init() {
    initGreeting();
    animateCounters();
    buildActivityBars();
    applyRelativeDates();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

const greetingDateEl = document.getElementById('greetingDate');
if (greetingDateEl) {
    greetingDateEl.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function formatRelativeDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date)) return null;

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    const time = date.toLocaleTimeString('en-ZA', { hour: 'numeric', minute: '2-digit', hour12: false });

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

    if (diffDays < 7) return `${date.toLocaleDateString('en-ZA', { weekday: 'short' })} ${time}`;

    const day = date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
    return `${day}, ${time}`;
}
function applyRelativeDates() {
    $$('[data-datetime]').forEach(el => {
        const formatted = formatRelativeDate(el.dataset.datetime);
        if (formatted) el.textContent = formatted;
    });
}
// x
// Tag Technology
// x
function createTagInput({ wrapId, chipsId, textInputId, suggestionsId, hiddenInputId }) {
    const wrap = $(`#${wrapId}`), chipsEl = $(`#${chipsId}`), textInput = $(`#${textInputId}`),
        suggestionsEl = $(`#${suggestionsId}`), hiddenInput = $(`#${hiddenInputId}`);
    if (!wrap || !textInput || !hiddenInput) return null;

    let tags = [], focusedIdx = -1;

    function sync() {
        hiddenInput.value = tags.join(',');
        chipsEl.innerHTML = tags.map(t => `<span class="tag-chip">${t}<button type="button" data-tag="${t}">&times;</button></span>`).join('');
        $$('.tag-chip button', chipsEl).forEach(btn => {
            btn.addEventListener('click', () => { tags = tags.filter(t => t !== btn.dataset.tag); sync(); });
        });
    }

    function addTag(raw) {
        const name = raw.trim().toLowerCase().replace(/^#/, '');
        if (!name || tags.includes(name)) return;
        tags.push(name);
        textInput.value = '';
        closeSuggestions();
        sync();
    }

    function closeSuggestions() { suggestionsEl.classList.remove('open'); suggestionsEl.innerHTML = ''; focusedIdx = -1; }

    function renderSuggestions(items) {
        if (!items.length) { closeSuggestions(); return; }
        suggestionsEl.innerHTML = items.map((name, i) => `<div class="tag-suggestion-item" data-idx="${i}">${name}</div>`).join('');
        suggestionsEl.classList.add('open');
        $$('.tag-suggestion-item', suggestionsEl).forEach(el => el.addEventListener('click', () => addTag(el.textContent)));
    }

    let searchTimer;
    textInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const q = textInput.value.trim();
        if (!q) { closeSuggestions(); return; }
        searchTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/tags/search?q=${encodeURIComponent(q)}`);
                const names = res.ok ? await res.json() : [];
                renderSuggestions(names.filter(n => !tags.includes(n)));
            } catch { closeSuggestions(); }
        }, 180);
    });

    textInput.addEventListener('keydown', e => {
        const items = $$('.tag-suggestion-item', suggestionsEl);
        if (e.key === 'ArrowDown' && items.length) {
            e.preventDefault();
            focusedIdx = (focusedIdx + 1) % items.length;
            items.forEach(i => i.classList.remove('focused')); items[focusedIdx].classList.add('focused');
        } else if (e.key === 'ArrowUp' && items.length) {
            e.preventDefault();
            focusedIdx = (focusedIdx - 1 + items.length) % items.length;
            items.forEach(i => i.classList.remove('focused')); items[focusedIdx].classList.add('focused');
        } else if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (focusedIdx >= 0 && items[focusedIdx]) addTag(items[focusedIdx].textContent);
            else if (textInput.value.trim()) addTag(textInput.value);
        } else if (e.key === 'Backspace' && !textInput.value && tags.length) {
            tags.pop(); sync();
        } else if (e.key === 'Escape') closeSuggestions();
    });

    document.addEventListener('click', e => { if (!wrap.contains(e.target)) closeSuggestions(); });

    return {
        setTags(t) { tags = [...t]; sync(); },
        getTags() { return [...tags]; },
        reset() { tags = []; sync(); },
        flushPending() { if (textInput.value.trim()) addTag(textInput.value); }
    };}

// Welcome modal — first-time trigger
document.addEventListener('DOMContentLoaded', () => {
    const welcomeModalEl = document.getElementById('welcomeModal');
    if (!welcomeModalEl) return;

    const showWelcome = welcomeModalEl.dataset.show === 'true';
    if (!showWelcome) return;

    const modal = new bootstrap.Modal(welcomeModalEl);
    modal.show();

    document.getElementById('welcomeContinueBtn').addEventListener('click', () => {
        markWelcomeSeen();
        modal.hide();
    });

    // Also mark seen if dismissed via backdrop click / esc, so it doesn't reappear
    welcomeModalEl.addEventListener('hidden.bs.modal', markWelcomeSeen, { once: true });
});
function markWelcomeSeen() {
    const csrfToken  = document.querySelector('meta[name="_csrf"]')?.content;
    const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content;
    const headers = {};
    if (csrfToken && csrfHeader) headers[csrfHeader] = csrfToken;

    fetch('/api/user/mark-welcome-seen', { method: 'POST', headers })
        .then(res => {
            if (!res.ok) console.error('Failed to mark welcome seen:', res.status);
        })
        .catch(err => console.error('Network error marking welcome seen:', err));
}
const taglines = [
    "overthinking is also an idea.",
    "procrastination is also an idea.",
    "daydreaming is also an idea.",
    "doing absolutely nothing is also an idea.",
    "shower thoughts are also an idea.",
    "that 2 am delusion is also an idea.",
    "staring at the ceiling is also an idea.",
    "being dramatically confused is also an idea.",
    "avoiding responsibilities is also an idea.",
    "random nonsense is also an idea.",
    "sleeping on your problems is also an idea.",
    "arguing with yourself is also an idea.",
    "imaginary conversations are also an idea.",
    "revenge planning in the shower is also an idea.",
    "pretending to be productive is also an idea.",
    "forgetting why you entered a room is also an idea.",
    "thinking about food while eating is also an idea.",
    "questioning your life choices is also an idea.",
    "making problems up is also an idea.",
    "being delusional with confidence is also an idea.",
    "accidental genius is also an idea.",
    "unfinished business is also an idea.",
    "bad decisions are also an idea.",
    "terrible jokes are also an idea.",
    "trusting the process without a process is also an idea.",
    "having 47 browser tabs open is also an idea.",
    "debugging your own existence is also an idea.",
    "breaking things to understand them is also an idea.",
    "coding at 3 am is also an idea.",
    "one more feature is also an idea.",
    "it works on my machine is also an idea.",
    "googling what you already know is also an idea.",
    "writing code and praying is also an idea.",
    "turning it off and on again is also an idea.",
    "inventing problems to solve is also an idea.",
    "overcomplicating simple things is also an idea.",
    "thinking you're the main character is also an idea.",
    "plotting world domination is also an idea.",
    "arguing with imaginary haters is also an idea.",
    "doing it for the plot is also an idea.",
    "having no plan whatsoever is also an idea.",
    "being productive tomorrow is also an idea.",
    "romanticising your struggles is also an idea.",
    "questionable genius is also an idea.",
    "forgetting your genius idea is also an idea.",
    "saving this thought before it disappears is also an idea.",
    "overthinking a conversation from 2017 is also an idea.",
    "planning your billionaire lifestyle with R12.00 in your account is also an idea.",
    "arguing with someone who isn't even there is also an idea.",
    "rehearsing an argument you will never have is also an idea.",
    "opening the fridge for the 9th time is also an idea.",
    "being broke but having expensive taste is also an idea.",
    "googling symptoms of being lazy is also an idea.",
    "pretending you understand the assignment is also an idea.",
    "writing a to-do list instead of doing the tasks is also an idea.",
    "waiting for motivation like it's a delivery is also an idea.",
    "having a whole business empire in your head is also an idea.",
    "staring at your bank balance and blinking twice is also an idea.",
    "creating fake scenarios before sleeping is also an idea.",
    "practising your acceptance speech in the mirror is also an idea.",
    "being the ceo of absolutely nothing is also an idea.",
    "mentally resigning from a job you don't have is also an idea.",
    "checking the fridge like new food might spawn is also an idea.",
    "having beef with someone who doesn't know you exist is also an idea.",
    "planning revenge and forgetting the reason is also an idea.",
    "being academically gifted but operationally confused is also an idea.",
    "saving money by spending more money is also an idea.",
    "starting a new life every monday is also an idea.",
    "thinking you're him after one productive morning is also an idea.",
    "writing code that even you don't understand is also an idea.",
    "blaming the compiler for your mistakes is also an idea.",
    "adding one more feature until the app becomes a country is also an idea.",
    "calling it a feature instead of a bug is also an idea.",
    "googling your own error message for the 47th time is also an idea.",
    "refactoring code that was perfectly fine is also an idea.",
    "deploying on friday and trusting god is also an idea.",
    "having 36 tabs open and remembering none of them is also an idea.",
    "being one tutorial away from changing your life is also an idea.",
    "planning to sleep early at 2:47 am is also an idea.",
    "having a phd in making things unnecessarily complicated is also an idea.",
    "acting mysterious because you forgot what you were saying is also an idea.",
    "manifesting success instead of opening your laptop is also an idea.",
    "thinking about quitting while actively doing nothing is also an idea.",
    "giving yourself a motivational speech and ignoring it is also an idea.",
    "being allergic to deadlines until the deadline arrives is also an idea.",
    "inventing a problem and becoming emotionally invested is also an idea.",
    "thinking of a comeback three business days later is also an idea.",
    "taking a break before starting is also an idea.",
    "being busy doing absolutely everything except the work is also an idea.",
    "pretending the deadline is a suggestion is also an idea.",
    "having unlimited ambition and limited battery is also an idea.",
    "making a comeback nobody asked for is also an idea.",
    "being delusional but with a strategic plan is also an idea.",
    "romanticising your financial struggles is also an idea.",
    "thinking outside the box because you lost the box is also an idea.",
    "your brain has no save button. we do."
];

const tagline = document.querySelector(".dx-tagline");

function changeTagline() {
    const randomIndex = Math.floor(Math.random() * taglines.length);
    tagline.textContent = taglines[randomIndex];
}

changeTagline();
setInterval(changeTagline, 10000);