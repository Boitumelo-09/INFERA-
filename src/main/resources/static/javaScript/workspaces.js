/* ═══════════════════════════════════════════════════════════════════
   INFERA — workspaces.js
   Handles:
     · Sidebar toggle (shared behaviour with dashboard)
     · Custom cursor
     · New Workspace modal + colour picker
     · Edit Workspace modal — populated from clicked tile's data-* attrs
     · Delete Workspace modal — confirms before submitting
     · Tile dropdown menus (three-dot "..." button)
     · Toast on page load if a flash message exists
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
  $$('a, button, input, textarea').forEach(el => {
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

/* Auto-toast from Thymeleaf flash messages already rendered in the DOM */
document.addEventListener('DOMContentLoaded', () => {
  const successEl = $('.flash-alert.success');
  const errorEl   = $('.flash-alert.error');
  if (successEl) showToast(successEl.querySelector('span')?.textContent || 'Success', 'success');
  if (errorEl)   showToast(errorEl.querySelector('span')?.textContent || 'Something went wrong', 'error');

  // Auto-hide flash banners after a few seconds
  $$('.flash-alert').forEach(el => {
    setTimeout(() => {
      el.style.transition = 'opacity 0.4s, transform 0.4s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => el.remove(), 400);
    }, 4000);
  });
});

/* ───────────────────────────────────────────────────────────────────
   NEW WORKSPACE MODAL
─────────────────────────────────────────────────────────────────── */
const newWorkspaceModalEl = $('#newWorkspaceModal');
const newWorkspaceModal   = newWorkspaceModalEl ? new bootstrap.Modal(newWorkspaceModalEl) : null;

function openNewWorkspaceModal() {
  newWorkspaceModal?.show();
  setTimeout(() => $('#wsName')?.focus(), 300);
}

$('#newWorkspaceBtn')?.addEventListener('click', openNewWorkspaceModal);
$('#newWorkspaceBtnTop')?.addEventListener('click', openNewWorkspaceModal);
$('#newWorkspaceBtnHeader')?.addEventListener('click', openNewWorkspaceModal);
$('#newWorkspaceBtnEmpty')?.addEventListener('click', openNewWorkspaceModal);

/* Colour picker — create modal */
$$('#colorPicker .cp-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    $$('#colorPicker .cp-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    $('#wsColor').value = swatch.dataset.color;
  });
});

/* Simple required-field guard before submit */
$('#newWorkspaceForm')?.addEventListener('submit', e => {
  const name = $('#wsName').value.trim();
  if (!name) {
    e.preventDefault();
    $('#wsName').focus();
    $('#wsName').style.borderColor = '#ef4444';
  }
});

/* ───────────────────────────────────────────────────────────────────
   EDIT WORKSPACE MODAL
─────────────────────────────────────────────────────────────────── */
const editWorkspaceModalEl = $('#editWorkspaceModal');
const editWorkspaceModal   = editWorkspaceModalEl ? new bootstrap.Modal(editWorkspaceModalEl) : null;
const editForm              = $('#editWorkspaceForm');

function openEditModal(tile) {
  const id          = tile.dataset.id;
  const name        = tile.dataset.name;
  const description = tile.dataset.description || '';
  const color       = tile.dataset.color || '#ea580c';

  // Point the form at /workspaces/{id}/update
  editForm.action = `/workspaces/${id}/update`;

  $('#editWsName').value  = name;
  $('#editWsDesc').value  = description === 'null' ? '' : description;
  $('#editWsColor').value = color;

  // Highlight the matching swatch
  $$('#editColorPicker .cp-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === color);
  });

  editWorkspaceModal?.show();
  setTimeout(() => $('#editWsName')?.focus(), 300);
}

/* Colour picker — edit modal */
$$('#editColorPicker .cp-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    $$('#editColorPicker .cp-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    $('#editWsColor').value = swatch.dataset.color;
  });
});

editForm?.addEventListener('submit', e => {
  const name = $('#editWsName').value.trim();
  if (!name) {
    e.preventDefault();
    $('#editWsName').focus();
    $('#editWsName').style.borderColor = '#ef4444';
  }
});

/* ───────────────────────────────────────────────────────────────────
   DELETE WORKSPACE MODAL
─────────────────────────────────────────────────────────────────── */
const deleteModalEl = $('#deleteWorkspaceModal');
const deleteModal    = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;
const deleteForm     = $('#deleteWorkspaceForm');

function openDeleteModal(tile) {
  const id   = tile.dataset.id;
  const name = tile.dataset.name;

  deleteForm.action = `/workspaces/${id}/delete`;
  $('#deleteWsName').textContent = name;

  deleteModal?.show();
}

/* ───────────────────────────────────────────────────────────────────
   TILE MENU (three-dot dropdown) + wiring edit/delete triggers
─────────────────────────────────────────────────────────────────── */
$$('.ws-tile').forEach(tile => {
  const menuWrap   = tile.querySelector('.ws-tile-menu');
  const menuBtn    = tile.querySelector('.ws-menu-btn');
  const editBtn    = tile.querySelector('.ws-edit-trigger');
  const deleteBtn  = tile.querySelector('.ws-delete-trigger');

  menuBtn?.addEventListener('click', e => {
    e.stopPropagation();
    // Close any other open menus first
    $$('.ws-tile-menu.open').forEach(m => { if (m !== menuWrap) m.classList.remove('open'); });
    menuWrap.classList.toggle('open');
  });

  editBtn?.addEventListener('click', e => {
    e.stopPropagation();
    menuWrap.classList.remove('open');
    openEditModal(tile);
  });

  deleteBtn?.addEventListener('click', e => {
    e.stopPropagation();
    menuWrap.classList.remove('open');
    openDeleteModal(tile);
  });
});

/* Close any open dropdown when clicking elsewhere on the page */
document.addEventListener('click', () => {
  $$('.ws-tile-menu.open').forEach(m => m.classList.remove('open'));
});

/* ───────────────────────────────────────────────────────────────────
   FORM INPUT FOCUS STYLES (shared visual language with auth pages)
─────────────────────────────────────────────────────────────────── */
$$('.form-input').forEach(input => {
  const group = input.closest('.form-group');
  const label = group?.querySelector('.form-label-custom');

  input.addEventListener('focus', () => { if (label) label.style.color = 'var(--accent)'; });
  input.addEventListener('blur',  () => { if (label) label.style.color = ''; });
  input.addEventListener('input', () => { input.style.borderColor = ''; });
});

/* ───────────────────────────────────────────────────────────────────
   SEARCH TRIGGER STUB (opens the same ⌘K modal pattern as dashboard,
   left as a hook — wire to your real search modal if present on this page)
─────────────────────────────────────────────────────────────────── */
$('#searchTrigger')?.addEventListener('click', () => {
  showToast('Search coming to this page soon');
});
$('#topbarSearch')?.addEventListener('click', () => {
  showToast('Search coming to this page soon');
});
