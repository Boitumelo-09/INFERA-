/* ═══════════════════════════════════════════════════════════════════
   INFERA — notes.js
   Handles:
     · Sidebar toggle + custom cursor (shared behaviour)
     · New Note modal
     · Edit Note modal — pre-filled from the clicked tile's data-* attrs
     · Delete Note modal — confirms before submitting
     · Tile dropdown menus
     · Workspace filter pills — client-side show/hide, no server round trip
     · Toast (shared showToast pattern)
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
   EDIT NOTE MODAL
─────────────────────────────────────────────────────────────────── */
const editNoteModalEl = $('#editNoteModal');
const editNoteModal   = editNoteModalEl ? new bootstrap.Modal(editNoteModalEl) : null;
const editNoteForm    = $('#editNoteForm');

function openEditNoteModal(tile) {
    const id          = tile.dataset.id;
    const title       = tile.dataset.title;
    const content     = tile.dataset.content || '';
    const workspaceId = tile.dataset.workspaceId;

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

function openDeleteNoteModal(tile) {
    const id    = tile.dataset.id;
    const title = tile.dataset.title;

    deleteNoteForm.action = `/notes/${id}/delete`;
    $('#deleteNoteTitle').textContent = title;

    deleteNoteModal?.show();
}

/* ───────────────────────────────────────────────────────────────────
   TILE MENU (three-dot dropdown) + edit/delete wiring
─────────────────────────────────────────────────────────────────── */
$$('.note-tile').forEach(tile => {
    const menuWrap  = tile.querySelector('.ws-tile-menu');
    const menuBtn   = tile.querySelector('.ws-menu-btn');
    const editBtn   = tile.querySelector('.note-edit-trigger');
    const deleteBtn = tile.querySelector('.note-delete-trigger');

    menuBtn?.addEventListener('click', e => {
        e.stopPropagation();
        $$('.ws-tile-menu.open').forEach(m => { if (m !== menuWrap) m.classList.remove('open'); });
        menuWrap.classList.toggle('open');
    });

    editBtn?.addEventListener('click', e => {
        e.stopPropagation();
        menuWrap.classList.remove('open');
        openEditNoteModal(tile);
    });

    deleteBtn?.addEventListener('click', e => {
        e.stopPropagation();
        menuWrap.classList.remove('open');
        openDeleteNoteModal(tile);
    });

    // Clicking anywhere else on the tile (not the menu) also opens edit —
    // convenient shortcut, matches "click a card to open it" expectations
    tile.addEventListener('click', () => openEditNoteModal(tile));
});

document.addEventListener('click', () => {
    $$('.ws-tile-menu.open').forEach(m => m.classList.remove('open'));
});

/* ───────────────────────────────────────────────────────────────────
   WORKSPACE FILTER PILLS — pure client-side, no server round trip
─────────────────────────────────────────────────────────────────── */
$$('.ws-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        $$('.ws-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const filter = pill.dataset.filter;

        $$('.note-tile').forEach(tile => {
            const matches = filter === 'all' || tile.dataset.workspaceId === filter;
            tile.classList.toggle('filtered-out', !matches);
        });
    });
});

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