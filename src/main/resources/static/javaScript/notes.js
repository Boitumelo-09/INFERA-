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
const newNoteTagWidget = createTagInput({
    wrapId: 'newNoteTagWrap', chipsId: 'newNoteTagChips',
    textInputId: 'newNoteTagsInput', suggestionsId: 'newNoteTagSuggestions', hiddenInputId: 'newNoteTags'
});
const editNoteTagWidget = createTagInput({
    wrapId: 'editNoteTagWrap', chipsId: 'editNoteTagChips',
    textInputId: 'editNoteTagsInput', suggestionsId: 'editNoteTagSuggestions', hiddenInputId: 'editNoteTags'
});
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
function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

    const tagList = (row.dataset.tags || '').split(',').filter(Boolean);
    $('#viewNoteTags').innerHTML = tagList.map(t => `<span class="view-note-tag-pill">#${t}</span>`).join('');

    renderResourcesForRow(row);

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
    newNoteTagWidget?.reset();
    newNoteModal?.show();
    setTimeout(() => $('#noteTitle')?.focus(), 300);
}

$('#newNoteBtnTop')?.addEventListener('click', openNewNoteModal);
$('#newNoteBtnHeader')?.addEventListener('click', openNewNoteModal);
$('#newNoteBtnEmpty')?.addEventListener('click', openNewNoteModal);

$('#newNoteForm')?.addEventListener('submit', e => {
    newNoteTagWidget?.flushPending();
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
    editNoteTagWidget?.setTags(row.dataset.tags ? row.dataset.tags.split(',').filter(Boolean) : []);

    editNoteModal?.show();
    setTimeout(() => $('#editNoteTitle')?.focus(), 300);
}

editNoteForm?.addEventListener('submit', e => {
    editNoteTagWidget?.flushPending();
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
function getYoutubeEmbedUrl(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function renderResourcesForRow(row) {
    const container = $('#viewNoteResourcesList');
    if (!container) return;

    const items = $$('.resource-data-item', row);
    if (!items.length) {
        container.innerHTML = `<p class="vnr-empty">No resources linked yet.</p>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const { id, title, url, description, category } = item.dataset;
        let body;

        if (category === 'VIDEO') {
            const embed = getYoutubeEmbedUrl(url);
            body = embed
                ? `<iframe src="${embed}" class="vnr-video-embed" allowfullscreen></iframe>`
                : `<a href="${url}" target="_blank" rel="noopener" class="vnr-link"><i class="bi bi-box-arrow-up-right"></i> ${escapeHtml(url)}</a>`;
        } else if (category === 'IMAGE') {
            body = `<img src="${url}" class="vnr-image" alt="${escapeHtml(title)}" onerror="this.src='';this.alt='Image failed to load — check if the link is publicly viewable.';" />`;
        } else {
            body = `<a href="${url}" target="_blank" rel="noopener" class="vnr-link"><i class="bi bi-box-arrow-up-right"></i> ${escapeHtml(url)}</a>`;
        }

        return `
        <div class="vnr-card" data-resource-id="${id}" data-title="${escapeHtml(title)}" data-url="${escapeHtml(url)}" data-description="${escapeHtml(description || '')}" data-category="${category}">
            <div class="vnr-card-top">
                <span class="vnr-category-tag ${category.toLowerCase()}">${category}</span>
                <div class="ws-tile-menu">
                    <button class="ws-menu-btn vnr-menu-btn" aria-label="Resource options"><i class="bi bi-three-dots-vertical"></i></button>
                    <div class="ws-menu-dropdown">
                        <button class="ws-menu-item resource-edit-trigger"><i class="bi bi-pencil"></i> Edit</button>
                        <button class="ws-menu-item danger resource-delete-trigger"><i class="bi bi-trash"></i> Delete</button>
                    </div>
                </div>
            </div>
            <h5 class="vnr-title">${escapeHtml(title)}</h5>
            ${description ? `<p class="vnr-description">${escapeHtml(description)}</p>` : ''}
            ${body}
        </div>`;
    }).join('');

    wireResourceCardMenus();
}

function wireResourceCardMenus() {
    $$('.vnr-card').forEach(card => {
        const menuWrap = card.querySelector('.ws-tile-menu');
        menuWrap.querySelector('.vnr-menu-btn')?.addEventListener('click', e => {
            e.stopPropagation();
            $$('.ws-tile-menu.open').forEach(m => { if (m !== menuWrap) m.classList.remove('open'); });
            menuWrap.classList.toggle('open');
        });
        card.querySelector('.resource-edit-trigger')?.addEventListener('click', e => {
            e.stopPropagation(); menuWrap.classList.remove('open'); openEditResourceModal(card);
        });
        card.querySelector('.resource-delete-trigger')?.addEventListener('click', e => {
            e.stopPropagation(); menuWrap.classList.remove('open'); openDeleteResourceModal(card);
        });
    });
}

const addResourceModalEl = $('#addResourceModal');
const addResourceModal   = addResourceModalEl ? new bootstrap.Modal(addResourceModalEl) : null;

$('#addResourceBtn')?.addEventListener('click', () => {
    if (!currentlyViewedRow) return;
    $('#addResourceNoteId').value = currentlyViewedRow.dataset.id;
    addResourceModal?.show();
});

const editResourceModalEl = $('#editResourceModal');
const editResourceModal   = editResourceModalEl ? new bootstrap.Modal(editResourceModalEl) : null;
const editResourceForm    = $('#editResourceForm');

function openEditResourceModal(card) {
    editResourceForm.action = `/resources/${card.dataset.resourceId}/update`;
    $('#editResourceTitle').value       = card.dataset.title;
    $('#editResourceUrl').value         = card.dataset.url;
    $('#editResourceDescription').value = card.dataset.description;
    $('#editResourceCategory').value    = card.dataset.category;
    editResourceModal?.show();
}

const deleteResourceModalEl = $('#deleteResourceModal');
const deleteResourceModal   = deleteResourceModalEl ? new bootstrap.Modal(deleteResourceModalEl) : null;
const deleteResourceForm    = $('#deleteResourceForm');

function openDeleteResourceModal(card) {
    deleteResourceForm.action = `/resources/${card.dataset.resourceId}/delete`;
    $('#deleteResourceTitle').textContent = card.dataset.title;
    deleteResourceModal?.show();
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
        $$('.ws-tile-menu.open').forEach(m => {
            if (m !== menuWrap) {
                m.classList.remove('open');
                m.closest('.note-row-item')?.classList.remove('menu-active');
            }
        });
        const isOpen = menuWrap.classList.toggle('open');
        row.classList.toggle('menu-active', isOpen);
    });

    viewBtn?.addEventListener('click', e => {
        e.stopPropagation();
        menuWrap.classList.remove('open');
        row.classList.remove('menu-active');
        openViewNoteModal(row);
    });

    editBtn?.addEventListener('click', e => {
        e.stopPropagation();
        menuWrap.classList.remove('open');
        row.classList.remove('menu-active');
        openEditNoteModal(row);
    });

    deleteBtn?.addEventListener('click', e => {
        e.stopPropagation();
        menuWrap.classList.remove('open');
        row.classList.remove('menu-active');
        openDeleteNoteModal(row);
    });
});

document.addEventListener('click', () => {
    $$('.ws-tile-menu.open').forEach(m => {
        m.classList.remove('open');
        m.closest('.note-row-item')?.classList.remove('menu-active');
    });
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
(function openViewFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const noteId = params.get('view');
    if (!noteId) return;

    const targetRow = document.querySelector(`.note-row-item[data-id="${noteId}"]`);
    if (!targetRow) return;

    setTimeout(() => openViewNoteModal(targetRow), 10);
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
/* ───────────────────────────────────────────────────────────────────
   TAG TECHNOLOGY
─────────────────────────────────────────────────────────────────── */
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