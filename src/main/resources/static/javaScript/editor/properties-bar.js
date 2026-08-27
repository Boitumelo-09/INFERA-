/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/properties-bar.js
   Makes the workspace pill and tags pill on the editor page live:
   workspace becomes a dropdown, tags become an inline comma-separated
   editor. Both write into window.__inferaPropsState, which
   editor-api.js reads when building the autosave snapshot; both call
   window.__inferaScheduleSave() to piggyback on the same debouncing the
   title and body already use — no second save path.
═══════════════════════════════════════════════════════════════════ */

const wsSelect     = document.getElementById('editorWsSelect');
const wsTrigger    = document.getElementById('editorWsTrigger');
const wsLabel      = document.getElementById('editorWsLabel');
const wsDropdown   = document.getElementById('editorWsDropdown');
const wsTopbarName = document.getElementById('editorTopbarWsName');

const tagsEditor  = document.getElementById('editorTagsEditor');
const tagsDisplay = document.getElementById('editorTagsDisplay');
const tagsInput   = document.getElementById('editorTagsInput');

// Seed shared state from what the server rendered — untouched until
// the user actually changes something.
window.__inferaPropsState = {
    workspaceId: window.__NOTE_WORKSPACE_ID__,
    tags: tagsEditor?.dataset.tagsCsv || '',
};

function renderTagPills(csv) {
    const names = csv.split(',').map(t => t.trim()).filter(Boolean);
    tagsDisplay.innerHTML = '';
    if (names.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'editor-property-pill editor-property-tag-empty';
        empty.textContent = 'No tags yet';
        tagsDisplay.appendChild(empty);
        return;
    }
    names.forEach(name => {
        const pill = document.createElement('span');
        pill.className = 'editor-property-pill editor-property-tag';
        pill.textContent = '#' + name;
        tagsDisplay.appendChild(pill);
    });
}

// ─── Workspace dropdown ─────────────────────────────
wsTrigger?.addEventListener('click', e => {
    e.stopPropagation();
    wsSelect.classList.toggle('open');
});
document.addEventListener('click', e => {
    if (!wsSelect?.contains(e.target)) wsSelect?.classList.remove('open');
});
wsDropdown?.querySelectorAll('.editor-ws-option').forEach(opt => {
    opt.addEventListener('click', () => {
        const id = Number(opt.dataset.id);
        wsSelect.classList.remove('open');
        if (id === window.__inferaPropsState.workspaceId) return;

        window.__inferaPropsState.workspaceId = id;
        wsLabel.textContent = opt.dataset.name;
        if (wsTopbarName) wsTopbarName.textContent = opt.dataset.name;
        ['editorTopbar', 'editorPageMain'].forEach(id2 => {
            document.getElementById(id2)?.style.setProperty('--ws-color', opt.dataset.color);
        });
        window.__inferaScheduleSave?.();
    });
});

// ─── Tags inline editor ─────────────────────────────
tagsDisplay?.addEventListener('click', () => {
    tagsInput.value = window.__inferaPropsState.tags;
    tagsDisplay.style.display = 'none';
    tagsInput.style.display = '';
    tagsInput.focus();
    tagsInput.select();
});

function commitTags() {
    const csv = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean).join(',');
    tagsInput.style.display = 'none';
    tagsDisplay.style.display = '';
    if (csv === window.__inferaPropsState.tags) return;

    window.__inferaPropsState.tags = csv;
    renderTagPills(csv);
    window.__inferaScheduleSave?.();
}

tagsInput?.addEventListener('blur', commitTags);
tagsInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); tagsInput.blur(); }
    if (e.key === 'Escape') { tagsInput.value = window.__inferaPropsState.tags; tagsInput.blur(); }
});