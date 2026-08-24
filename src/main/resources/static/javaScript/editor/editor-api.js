/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/editor-api.js
   Debounced autosave. Watches the title input and the Tiptap editor's
   own 'update' event, and PUTs to /api/notes/{id} once things settle.
   No import/export here — marked type="module" only so its execution
   timing matches tiptap-editor.js (both deferred, both post-parse).
═══════════════════════════════════════════════════════════════════ */

const SAVE_DEBOUNCE_MS = 1500;

const noteId      = window.__NOTE_ID__;
const csrfToken    = document.querySelector('meta[name="_csrf"]')?.content;
const csrfHeader     = document.querySelector('meta[name="_csrf_header"]')?.content;

const titleInput  = document.getElementById('editorTitleInput');
const statusEl     = document.getElementById('editorSaveStatus');
const statusIcon    = statusEl?.querySelector('i');
const statusText     = statusEl?.querySelector('span');

let lastSavedSnapshot = null;
let saveTimer = null;
let isSaving = false;
let dirtyDuringSave = false;

function setStatus(state) {
    if (!statusEl) return;
    statusEl.classList.remove('saving', 'error');
    if (state === 'saving') {
        statusEl.classList.add('saving');
        statusIcon.className = 'bi bi-arrow-repeat';
        statusText.textContent = 'Saving…';
    } else if (state === 'error') {
        statusEl.classList.add('error');
        statusIcon.className = 'bi bi-exclamation-circle';
        statusText.textContent = 'Retrying…';
    } else {
        statusIcon.className = 'bi bi-check2';
        statusText.textContent = 'Saved';
    }
}

function currentSnapshot() {
    const title = (titleInput?.value || '').trim() || 'Untitled';
    const documentJson = JSON.stringify(window.__inferaEditor.getJSON());
    return { title, documentJson };
}

async function performSave() {
    if (!window.__inferaEditor) return; // editor not mounted yet — nothing to save
    if (isSaving) { dirtyDuringSave = true; return; }

    isSaving = true;
    setStatus('saving');
    const snapshot = currentSnapshot();

    try {
        const res = await fetch(`/api/notes/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                [csrfHeader]: csrfToken,
            },
            body: JSON.stringify(snapshot),
        });

        if (!res.ok) throw new Error('Save failed: ' + res.status);

        lastSavedSnapshot = JSON.stringify(snapshot);
        setStatus('saved');
    } catch (err) {
        console.error('[INFERA] autosave error', err);
        setStatus('error');
        saveTimer = setTimeout(scheduleSave, 4000); // retry, don't just give up
    } finally {
        isSaving = false;
        if (dirtyDuringSave) {
            dirtyDuringSave = false;
            scheduleSave();
        }
    }
}

function scheduleSave() {
    if (!window.__inferaEditor) return;
    const snapshot = JSON.stringify(currentSnapshot());
    if (snapshot === lastSavedSnapshot) return; // nothing actually changed — skip the request entirely

    clearTimeout(saveTimer);
    saveTimer = setTimeout(performSave, SAVE_DEBOUNCE_MS);
}

titleInput?.addEventListener('input', scheduleSave);

// tiptap-editor.js runs as a separate module and may finish mounting
// slightly after this script starts — poll briefly rather than assume
// load order between two independent module scripts.
function waitForEditor() {
    if (window.__inferaEditor) {
        lastSavedSnapshot = JSON.stringify(currentSnapshot());
        window.__inferaEditor.on('update', scheduleSave);
    } else {
        setTimeout(waitForEditor, 50);
    }
}
waitForEditor();

/* Save immediately (skip the debounce) when the tab loses visibility —
   e.g. switching tabs or apps. Deliberately NOT using beforeunload +
   sendBeacon here: sendBeacon can only send POST with no custom headers,
   so it can't carry the CSRF header this PUT endpoint requires. A fake
   "safety net" that silently fails the CSRF check would be worse than
   no safety net — visibilitychange fires early enough that a normal
   fetch usually completes before the page actually goes away. */
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        clearTimeout(saveTimer);
        performSave();
    }
});