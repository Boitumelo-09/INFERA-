/* ═══════════════════════════════════════════════════════════════════
   INFERA — notes.js
   Key behaviour change from the tile version:
     · Clicking a ROW opens the VIEW modal (read-only)
     · Clicking the three-dot menu → View / Edit / Delete
     · Edit modal is ONLY reachable via the menu or the
       "Edit this note" button inside the View modal
═══════════════════════════════════════════════════════════════════ */

'use strict';

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ───────────────────────────────────────────────────────────────────
   CUSTOM CURSOR
─────────────────────────────────────────────────────────────────── */
const dot  = $('#cursorDot');
const ring = $('#cursorRing');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

if (dot && ring) {
    document.addEventListener('mousemove', e => {
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
    $$('a, button, input, textarea, select').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
}

/* ───────────────────────────────────────────────────────────────────
   SIDEBAR TOGGLE (mobile)
─────────────────────────────────────────────────────────────────── */
const sidebar        = $('#sidebar');
const sidebarToggle  = $('#sidebarToggle');
const sidebarClose   = $('#sidebarClose');
const sidebarOverlay = $('#sidebarOverlay');

function openSidebar() {
    sidebar?.classList.add('open');
    sidebarOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeSidebar() {
    sidebar?.classList.remove('open');
    sidebarOverlay?.classList.remove('active');
    document.body.style.overflow = '';
}
sidebarToggle?.addEventListener('click', openSidebar);
sidebarClose?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

/* ───────────────────────────────────────────────────────────────────
   SOFT PAGE NAVIGATION
   Fades THIS page in on arrival (continuity with whichever page
   linked here), and is available for any future outbound links too.
─────────────────────────────────────────────────────────────────── */
function softNavigate(url) {
    document.body.classList.add('page-transitioning');
    setTimeout(() => { window.location.href = url; }, 240);
}

window.addEventListener('pageshow', () => {
    document.body.classList.remove('page-transitioning');
});

window.addEventListener('resize', () => {
    if (window.innerWidth >= 992) closeSidebar();
});

/* ───────────────────────────────────────────────────────────────────
   TOAST
─────────────────────────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
    const toast     = $('#inferaToast');
    const toastMsg  = $('#toastMsg');
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
   VIEW NOTE MODAL — the default action when clicking a row
─────────────────────────────────────────────────────────────────── */
const viewNoteModalEl = $('#viewNoteModal');
const viewNoteModal    = viewNoteModalEl ? new bootstrap.Modal(viewNoteModalEl) : null;

let currentlyViewedRow = null;   // remembers which row is open, so "Edit this note" knows what to edit

function openViewNoteModal(row) {
    currentlyViewedRow = row;

    const title       = row.dataset.title;
    const content     = row.dataset.content || '';
    const wsName      = row.dataset.workspaceName;
    const wsColor     = getComputedStyle(row).getPropertyValue('--ws-color').trim() || '#ea580c';
    const dateText    = row.querySelector('.nri-date span')?.textContent || '';

    // Apply the workspace colour to the whole modal — scrollbar, edit button,
    // and the badge all read from this one variable
    const modalContent = viewNoteModalEl?.querySelector('.view-note-content');
    modalContent?.style.setProperty('--ws-color', wsColor);

    $('#viewNoteTitle').textContent = title;
    $('#viewNoteWs').textContent    = wsName;
    $('#viewNoteWs').style.setProperty('--ws-color', wsColor);
    $('#viewNoteDate').innerHTML    = `<i class="bi bi-clock-history"></i> Updated ${dateText}`;

    const bodyEl = $('#viewNoteContent');
    const cleanContent = content === 'null' ? '' : content;
    bodyEl.textContent = cleanContent;
    bodyEl.classList.toggle('is-empty', !cleanContent.trim());

    viewNoteModal?.show();
}

/* "Edit this note" button inside the View modal — hands off to the Edit modal */
$('#viewNoteEditBtn')?.addEventListener('click', () => {
    if (!currentlyViewedRow) return;
    viewNoteModal?.hide();
    setTimeout(() => openEditNoteModal(currentlyViewedRow), 250);
});

/* ───────────────────────────────────────────────────────────────────
   THEATER MODE — expand/shrink toggle, like YouTube's expand button
─────────────────────────────────────────────────────────────────── */
const viewNoteDialog     = $('#viewNoteDialog');
const viewNoteExpandBtn  = $('#viewNoteExpandBtn');
let isTheaterMode = false;

function setTheaterMode(on) {
    isTheaterMode = on;
    viewNoteDialog?.classList.toggle('theater-mode', on);

    const icon = viewNoteExpandBtn?.querySelector('i');
    if (icon) {
        icon.className = on ? 'bi bi-arrows-angle-contract' : 'bi bi-arrows-angle-expand';
    }
    if (viewNoteExpandBtn) {
        viewNoteExpandBtn.title = on ? 'Shrink' : 'Expand';
    }

    // Deepen the backdrop blur while expanded — reinforces the "focus mode" feel
    const backdrop = document.querySelector('.modal-backdrop');
    backdrop?.classList.toggle('theater-backdrop', on);
}

viewNoteExpandBtn?.addEventListener('click', () => setTheaterMode(!isTheaterMode));

/* Reset to normal size every time the modal is closed, so it doesn't
   reopen expanded next time by surprise */
viewNoteModalEl?.addEventListener('hidden.bs.modal', () => setTheaterMode(false));

/* Keyboard shortcut: "f" toggles theater mode while the view modal is open,
   mirroring the muscle memory people already have from video players */
document.addEventListener('keydown', e => {
    const modalIsOpen = viewNoteModalEl?.classList.contains('show');
    if (!modalIsOpen) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (e.key === 'f' || e.key === 'F') {
        setTheaterMode(!isTheaterMode);
    }
});

/* ───────────────────────────────────────────────────────────────────
   NEW NOTE MODAL
─────────────────────────────────────────────────────────────────── */
const newNoteModalEl = $('#newNoteModal');
const newNoteModal   = newNoteModalEl ? new bootstrap.Modal(newNoteModalEl) : null;

function openNewNoteModal() {
    newNoteModal?.show();
    setTimeout(() => $('#noteTitle')?.focus(), 300);
}

$('#newNoteBtnTop')?.addEventListener('click', openNewNoteModal);
$('#newNoteBtnHeader')?.addEventListener('click', openNewNoteModal);
$('#newNoteBtnEmpty')?.addEventListener('click', openNewNoteModal);

$('#newNoteForm')?.addEventListener('submit', e => {
    const title = $('#noteTitle').value.trim();
    if (!title) {
        e.preventDefault();
        $('#noteTitle').focus();
        $('#noteTitle').style.borderColor = '#ef4444';
    }
});

/* ───────────────────────────────────────────────────────────────────
   EDIT NOTE MODAL — only reachable via menu or View modal's edit button
─────────────────────────────────────────────────────────────────── */
const editNoteModalEl = $('#editNoteModal');
const editNoteModal   = editNoteModalEl ? new bootstrap.Modal(editNoteModalEl) : null;
const editNoteForm    = $('#editNoteForm');

function openEditNoteModal(row) {
    const id          = row.dataset.id;
    const title       = row.dataset.title;
    const content     = row.dataset.content || '';
    const workspaceId = row.dataset.workspaceId;

    editNoteForm.action = `/notes/${id}/update`;

    $('#editNoteTitle').value     = title;
    $('#editNoteContent').value   = content === 'null' ? '' : content;
    $('#editNoteWorkspace').value = workspaceId;

    editNoteModal?.show();
    setTimeout(() => $('#editNoteTitle')?.focus(), 300);
}

editNoteForm?.addEventListener('submit', e => {
    const title = $('#editNoteTitle').value.trim();
    if (!title) {
        e.preventDefault();
        $('#editNoteTitle').focus();
        $('#editNoteTitle').style.borderColor = '#ef4444';
    }
});

/* ───────────────────────────────────────────────────────────────────
   DELETE NOTE MODAL
─────────────────────────────────────────────────────────────────── */
const deleteNoteModalEl = $('#deleteNoteModal');
const deleteNoteModal   = deleteNoteModalEl ? new bootstrap.Modal(deleteNoteModalEl) : null;
const deleteNoteForm    = $('#deleteNoteForm');

function openDeleteNoteModal(row) {
    const id    = row.dataset.id;
    const title = row.dataset.title;

    deleteNoteForm.action = `/notes/${id}/delete`;
    $('#deleteNoteTitle').textContent = title;

    deleteNoteModal?.show();
}

/* ───────────────────────────────────────────────────────────────────
   ROW WIRING — click row = View, three-dot menu = View/Edit/Delete
─────────────────────────────────────────────────────────────────── */
$$('.note-row-item').forEach(row => {
    const menuWrap   = row.querySelector('.ws-tile-menu');
    const menuBtn    = row.querySelector('.nri-menu-btn');
    const viewBtn    = row.querySelector('.note-view-trigger');
    const editBtn    = row.querySelector('.note-edit-trigger');
    const deleteBtn  = row.querySelector('.note-delete-trigger');

    // Clicking anywhere on the row (but not the menu) opens the read-only view
    row.addEventListener('click', e => {
        if (menuWrap.contains(e.target)) return;   // let the menu handle its own clicks
        openViewNoteModal(row);
    });

    menuBtn?.addEventListener('click', e => {
        e.stopPropagation();
        $$('.ws-tile-menu.open').forEach(m => { if (m !== menuWrap) m.classList.remove('open'); });
        menuWrap.classList.toggle('open');
    });

    viewBtn?.addEventListener('click', e => {
        e.stopPropagation();
        menuWrap.classList.remove('open');
        openViewNoteModal(row);
    });

    editBtn?.addEventListener('click', e => {
        e.stopPropagation();
        menuWrap.classList.remove('open');
        openEditNoteModal(row);
    });

    deleteBtn?.addEventListener('click', e => {
        e.stopPropagation();
        menuWrap.classList.remove('open');
        openDeleteNoteModal(row);
    });
});

document.addEventListener('click', () => {
    $$('.ws-tile-menu.open').forEach(m => m.classList.remove('open'));
});

/* ───────────────────────────────────────────────────────────────────
   WORKSPACE FILTER PILLS — pure client-side, no server round trip
─────────────────────────────────────────────────────────────────── */
function applyWorkspaceFilter(filter) {
    $$('.ws-filter-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.filter === filter);
    });

    $$('.note-row-item').forEach(row => {
        const matches = filter === 'all' || row.dataset.workspaceId === filter;
        row.classList.toggle('filtered-out', !matches);
    });
}

$$('.ws-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => applyWorkspaceFilter(pill.dataset.filter));
});

/* ───────────────────────────────────────────────────────────────────
   PRE-APPLY FILTER FROM URL
   Lets a workspace tile link (e.g. /notes?workspace=3) land here
   already filtered — as if the user had clicked that filter pill.
─────────────────────────────────────────────────────────────────── */
(function applyFilterFromUrl() {
    const params      = new URLSearchParams(window.location.search);
    const workspaceId = params.get('workspace');
    if (!workspaceId) return;

    // Only proceed if a matching pill actually exists (it won't if there's
    // just one workspace, since the pill row isn't rendered in that case —
    // and with only one workspace, every note already belongs to it anyway)
    const targetPill = document.querySelector(`.ws-filter-pill[data-filter="${workspaceId}"]`);
    if (!targetPill) return;

    applyWorkspaceFilter(workspaceId);
    targetPill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
})();

/* ───────────────────────────────────────────────────────────────────
   FORM INPUT FOCUS STYLES
─────────────────────────────────────────────────────────────────── */
$$('.form-input').forEach(input => {
    const group = input.closest('.form-group');
    const label = group?.querySelector('.form-label-custom');

    input.addEventListener('focus', () => { if (label) label.style.color = 'var(--accent)'; });
    input.addEventListener('blur',  () => { if (label) label.style.color = ''; });
    input.addEventListener('input', () => { input.style.borderColor = ''; });
});

/* ───────────────────────────────────────────────────────────────────
   SEARCH TRIGGER STUB
─────────────────────────────────────────────────────────────────── */
$('#searchTrigger')?.addEventListener('click', () => showToast('Search coming to this page soon'));
$('#topbarSearch')?.addEventListener('click', () => showToast('Search coming to this page soon'));