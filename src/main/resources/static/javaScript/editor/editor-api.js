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

// Separate from lastSavedSnapshot on purpose: that one resets on every
// successful autosave (every ~1.5s of typing), so it can't tell us
// "has anything changed since the page was opened". This one only
// resets after a successful activity-log call, so it tracks a whole
// editing session instead of a single debounce cycle.
let sessionBaselineSnapshot = null;
let loggingEdit = false;

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
    const props = window.__inferaPropsState || {};
    return { title, documentJson, workspaceId: props.workspaceId, tags: props.tags };
}

// Deliberately title + documentJson only — a workspace move already
// logs its own NOTE_UPDATED entry (see properties-bar.js flow in
// NoteService.autosaveNote), and tag-only edits don't log at all, same
// as they don't trigger a workspace-move-style log. This must not
// double up with either.
function sessionContentSnapshot() {
    const title = (titleInput?.value || '').trim() || 'Untitled';
    const documentJson = JSON.stringify(window.__inferaEditor.getJSON());
    return JSON.stringify({ title, documentJson });
}

async function logEditIfChanged() {
    if (!window.__inferaEditor || loggingEdit) return;
    const current = sessionContentSnapshot();
    if (current === sessionBaselineSnapshot) return; // nothing changed since baseline — nothing to log

    loggingEdit = true;
    try {
        const res = await fetch(`/api/notes/${noteId}/log-edit`, {
            method: 'POST',
            headers: { [csrfHeader]: csrfToken },
            keepalive: true, // lets the request survive the page navigating away right after
        });
        if (res.ok) sessionBaselineSnapshot = current; // reset so re-hiding without further edits won't relog
    } catch (err) {
        console.error('[INCAPTUR] activity log error', err);
        // Deliberately not retried like performSave() is — a missed
        // Activity entry isn't worth fighting for the way a missed
        // save would be; it'll just log next time something changes.
    } finally {
        loggingEdit = false;
    }
}
async function performSave(isExit = false) {
    if (!window.__inferaEditor) return; // editor not mounted yet — nothing to save
    if (isSaving) { dirtyDuringSave = true; return; }

    isSaving = true;
    setStatus('saving');
    const snapshot = currentSnapshot();
    const body = JSON.stringify(snapshot);

    // keepalive only makes sense (and is only safe) for the exit-time
    // save: it lets the request survive the page tearing down, but
    // Chrome caps keepalive request bodies at ~64KB combined — a big
    // note's documentJson can blow past that, which makes fetch() throw
    // TypeError: Failed to fetch synchronously, every single retry,
    // forever. Routine debounce autosaves don't need keepalive at all,
    // so they skip it entirely and never hit that cap.
    const useKeepalive = isExit && body.length < 60000;

    try {
        const res = await fetch(`/api/notes/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                [csrfHeader]: csrfToken,
            },
            body,
            keepalive: useKeepalive,
        });
        if (!res.ok) throw new Error('Save failed: ' + res.status);

        lastSavedSnapshot = JSON.stringify(snapshot);
        setStatus('saved');
    } catch (err) {
        console.error('[INFERA] autosave error', err);
        setStatus('error');
        saveTimer = setTimeout(() => performSave(isExit), 4000); // retry, don't just give up
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
        sessionBaselineSnapshot = sessionContentSnapshot();
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
        performSave(true);
        logEditIfChanged();
    }
});

// Back-button/navigation isn't guaranteed to fire visibilitychange
// before the browser tears the page down (Safari especially) — pagehide
// is the more reliable "user is actually leaving" signal. keepalive on
// the fetch above is what actually lets the request survive either way,
// but only below the ~64KB cap — see performSave().
window.addEventListener('pagehide', () => {
    clearTimeout(saveTimer);
    performSave(true);
    logEditIfChanged();
});
// properties-bar.js (workspace/tags) triggers saves through this same
// debounce, so a workspace switch or tag edit doesn't open a second
// save path.
window.__inferaScheduleSave = scheduleSave;