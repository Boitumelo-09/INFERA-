/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/drawing-node.js
   Tiptap block node for inline drawings + a tiny shared store of
   drawing previews. The node only stores { drawingId, mode }; scene
   data and the preview SVG live on the server (Drawing entity).
═══════════════════════════════════════════════════════════════════ */

import { Node, mergeAttributes } from 'https://esm.sh/@tiptap/core@2.11.5';
import { Plugin, PluginKey }     from 'https://esm.sh/@tiptap/pm@2.11.5/state';
import { drawingSession, MAX_PAGES } from './drawing-canvas.js';
/* ─── API helpers ──────────────────────────────────────────────── */
const DEFAULT_HEIGHT = 480;
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 1200;
export const clampHeight = v => {
    if (v == null || v === '') return DEFAULT_HEIGHT;
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, n)) : DEFAULT_HEIGHT;
};

export const clampPages = v => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(MAX_PAGES, Math.max(1, n)) : 1;
};

function csrfHeaders() {
    const token  = document.querySelector('meta[name="_csrf"]')?.content;
    const header = document.querySelector('meta[name="_csrf_header"]')?.content;
    return token && header ? { [header]: token } : {};
}

export async function createDrawing(mode, noteId = window.__NOTE_ID__) {
    const res = await fetch(`/api/notes/${noteId}/drawings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ mode }),
    });
    if (!res.ok) throw new Error('Create drawing failed: ' + res.status);
    return res.json(); // DrawingResponse: { id, noteId, mode, sceneJson, previewSvg, ... }
}

/* ─── Preview store ────────────────────────────────────────────── */
/* One list call per page load; node views read from the cache and
   re-render when it changes. Step 3 will call put() after each save
   so the static preview refreshes. */
const cache = new Map();          // drawingId -> { id, mode, previewSvg, updatedAt }
const listeners = new Set();
let loaded = false;
let loadPromise = null;

const notify = () => listeners.forEach(fn => fn());

export const drawingStore = {
    get: id => cache.get(id),
    isLoaded: () => loaded,
    put(summary) { cache.set(summary.id, summary); notify(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    ensureLoaded(noteId) {
        if (!noteId) return Promise.resolve();
        if (!loadPromise) {
            loadPromise = fetch(`/api/notes/${noteId}/drawings`, { headers: { Accept: 'application/json' } })
                .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
                .then(list => { list.forEach(s => cache.set(s.id, s)); loaded = true; notify(); })
                .catch(() => { loadPromise = null; }); // allow a retry on the next node view
        }
        return loadPromise;
    },
};

/* ─── Tiptap node ──────────────────────────────────────────────── */
const Drawing = Node.create({
    name: 'drawing',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: false,

    addOptions() {
        // View modal (Step 4) can override this with its own note id.
        return { getNoteId: () => window.__NOTE_ID__ };
    },

    addAttributes() {
        return {
            drawingId: {
                default: null,
                parseHTML: el => { const v = el.getAttribute('data-drawing-id'); return v ? Number(v) : null; },
                renderHTML: a => (a.drawingId == null ? {} : { 'data-drawing-id': a.drawingId }),
            },
            mode: {
                default: 'DRAWING',
                parseHTML: el => el.getAttribute('data-mode') || 'DRAWING',
                renderHTML: a => ({ 'data-mode': a.mode }),
            },
            height: {
                default: DEFAULT_HEIGHT,
                parseHTML: el => clampHeight(el.getAttribute('data-height')),
                renderHTML: a => ({ 'data-height': a.height }),
            },
            pages: {
                default: 1,
                parseHTML: el => clampPages(el.getAttribute('data-pages')),
                renderHTML: a => ({ 'data-pages': a.pages }),            },
        };
    },

    parseHTML()  { return [{ tag: 'div[data-type="drawing"]' }]; },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes({ 'data-type': 'drawing' }, HTMLAttributes)];
    },

    addCommands() {
        return {
            // Trailing paragraph so the cursor never gets stranded after the node
            insertDrawing: attrs => ({ commands }) =>
                commands.insertContent([{ type: this.name, attrs }, { type: 'paragraph' }]),
        };
    },

    addNodeView() {
        const getNoteId = this.options.getNoteId;

        return ({ node,editor,getPos }) => {
            let current = node;
            let objectUrl = null;
            let live = false;        // true while the Excalidraw canvas is mounted here
            let renderedKey = null;  // what the preview was last drawn from

            const dom = document.createElement('div');
            dom.className = 'drawing-node';
            dom.setAttribute('contenteditable', 'false');

            const applyHeight = h => { dom.style.height = clampHeight(h) + 'px'; };
            applyHeight(current.attrs.height);

            /* ─── Resize handle (bottom edge) ─── */
            /* ─── Expand / collapse: full-screen overlay on the SAME live canvas ─── */
            let expanded = false;
            const expandBtn = document.createElement('button');
            expandBtn.type = 'button';
            expandBtn.className = 'drawing-expand-btn';
            expandBtn.innerHTML = '<i class="bi bi-arrows-angle-expand"></i>';

            const applyExpanded = on => {
                expanded = on;
                dom.classList.toggle('is-expanded', on);
                document.body.classList.toggle('drawing-expanded', on); // freezes page scroll behind the overlay
                expandBtn.querySelector('i').className = on ? 'bi bi-arrows-angle-contract' : 'bi bi-arrows-angle-expand';
                const label = on ? 'Exit full screen' : 'Full screen';
                expandBtn.title = label;
                expandBtn.setAttribute('aria-label', label);
            };
            const setExpanded = on => {
                applyExpanded(on);
                drawingSession.refresh(); // canvas moved/resized: Excalidraw must re-measure
            };
            applyExpanded(false);

            expandBtn.addEventListener('click', async e => {
                e.stopPropagation(); // don't let the card's own click handler run as well
                if (expanded) { setExpanded(false); return; }
                if (!live) await drawingSession.activate(ctx); // from a static preview: open first, then expand
                if (live) setExpanded(true);
            });

            const handle = document.createElement('div');
            handle.className = 'drawing-resize-handle';
            handle.setAttribute('role', 'separator');
            handle.setAttribute('aria-orientation', 'horizontal');
            handle.setAttribute('aria-label', 'Resize drawing (arrow keys)');
            handle.tabIndex = 0;
            handle.title = 'Drag to resize';

            const commitHeight = h => {
                const pos = getPos();
                const height = clampHeight(h);
                if (typeof pos !== 'number' || height === current.attrs.height) return;
                editor.view.dispatch(
                    editor.view.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, height })
                );
            };

            handle.addEventListener('pointerdown', e => {
                if (e.button !== 0) return;
                e.preventDefault();
                handle.setPointerCapture(e.pointerId);
                const startY = e.clientY;
                const startH = current.attrs.height;
                let liveH = startH;
                dom.classList.add('is-resizing');

                const move = ev => {
                    liveH = clampHeight(startH + (ev.clientY - startY));
                    applyHeight(liveH);
                };
                const end = () => {
                    handle.removeEventListener('pointermove', move);
                    handle.removeEventListener('pointerup', end);
                    handle.removeEventListener('pointercancel', end);
                    dom.classList.remove('is-resizing');
                    commitHeight(liveH);
                };
                handle.addEventListener('pointermove', move);
                handle.addEventListener('pointerup', end);
                handle.addEventListener('pointercancel', end);
            });

            handle.addEventListener('keydown', e => {
                if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                e.preventDefault();
                const next = clampHeight(current.attrs.height + (e.key === 'ArrowDown' ? 24 : -24));
                applyHeight(next);
                commitHeight(next);
            });

            const revoke = () => { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; } };

            const placeholder = (mode, text) => {
                const ph = document.createElement('div');
                ph.className = 'drawing-placeholder';
                ph.innerHTML = `<i class="bi ${mode === 'HANDWRITING' ? 'bi-journal-text' : 'bi-brush'}"></i><span></span>`;
                ph.querySelector('span').textContent = text;
                return ph;
            };

            const keyOf = () => {
                const s = drawingStore.get(current.attrs.drawingId);
                return `${drawingStore.isLoaded()}|${s ? s.updatedAt + '|' + s.mode : 'none'}`;
            };

            const render = () => {
                if (live) return; // never wipe the live canvas
                renderedKey = keyOf();
                revoke();
                dom.textContent = '';
                const summary = drawingStore.get(current.attrs.drawingId);
                const mode = summary?.mode || current.attrs.mode;
                const isHand = mode === 'HANDWRITING';
                dom.dataset.mode = isHand ? 'handwriting' : 'drawing';

                if (summary?.previewSvg) {
                    // <img> + blob URL: SVG loaded this way can't run scripts,
                    // so no sanitising step is needed for the preview.
                    const img = document.createElement('img');
                    img.className = 'drawing-preview-img';
                    img.alt = isHand ? 'Handwriting page' : 'Drawing';
                    img.draggable = false;
                    objectUrl = URL.createObjectURL(new Blob([summary.previewSvg], { type: 'image/svg+xml' }));
                    img.src = objectUrl;
                    dom.appendChild(img);
                } else if (summary) {
                    dom.appendChild(placeholder(mode, isHand ? 'Empty handwriting page' : 'Empty drawing'));
                } else if (drawingStore.isLoaded()) {
                    dom.appendChild(placeholder(mode, 'Drawing not found'));
                } else {
                    dom.appendChild(placeholder(mode, isHand ? 'Handwriting' : 'Drawing'));
                }
                // render() clears the node, so the handle is re-attached each time.
                // No handle in read-only surfaces (View modal).
                if (editor.isEditable) { dom.appendChild(handle); dom.appendChild(expandBtn); }
            };

            // Only redraw when this drawing's own data changed (saves of *other*
            // drawings must not reload this preview image).
            const unsubscribe = drawingStore.subscribe(() => {
                if (!live && keyOf() !== renderedKey) render();
            });

            const ctx = {
                dom,
                csrfHeaders,
                get noteId() { return getNoteId?.(); },
                get drawingId() { return current.attrs.drawingId; },
                get mode() { return drawingStore.get(current.attrs.drawingId)?.mode || current.attrs.mode; },
                setLoading: on => dom.classList.toggle('is-loading', on),
                enter() {
                    // Drop the note's selection (a NodeSelection on this card) so the
                    // browser has no selected content to start dragging from.
                    editor.commands.blur();
                    window.getSelection()?.removeAllRanges();
                    live = true;
                    revoke();
                    dom.textContent = '';
                    dom.classList.add('is-live');
                    const mount = document.createElement('div');
                    mount.className = 'drawing-live-mount';
                    dom.appendChild(mount);
                    dom.appendChild(handle); // resizing stays available while drawing
                    dom.appendChild(expandBtn);
                    return mount;
                },
                isExpanded: () => expanded,
                get pages() { return clampPages(current.attrs.pages); },
                setPages(n) {
                    const pos = getPos();
                    const pages = clampPages(n);
                    if (typeof pos !== 'number' || pages === clampPages(current.attrs.pages)) return;
                    // Kept out of the note's undo history, so undoing text can't silently drop a page
                    editor.view.dispatch(
                        editor.view.state.tr
                            .setNodeMarkup(pos, undefined, { ...current.attrs, pages })
                            .setMeta('addToHistory', false)
                    );
                },                leave() {
                    applyExpanded(false);
                    live = false;
                    dom.classList.remove('is-live');
                    render();
                },
                onSaved: summary => drawingStore.put(summary),
            };

            if (editor.isEditable) dom.title = 'Click to draw';
            dom.addEventListener('click', e => {
                if (!editor.isEditable || live || handle.contains(e.target)) return;
                drawingSession.activate(ctx);
            });

            // Second line of defence: a native drag must never start from a drawing
            // card. It shows a ghost of the page and, before entering, could move the node.
            dom.addEventListener('dragstart', e => { e.preventDefault(); e.stopPropagation(); });
            dom.addEventListener('selectstart', e => {
                if (!live) return;
                const el = e.target instanceof Element ? e.target : e.target?.parentElement;
                if (el?.closest('textarea, input')) return; // the text tool's own editor
                e.preventDefault();
            });
            drawingStore.ensureLoaded(getNoteId?.());
            render();

            return {
                dom,
                update(updated) {
                    if (updated.type !== current.type) return false;
                    const idChanged = updated.attrs.drawingId !== current.attrs.drawingId;
                    const heightChanged = updated.attrs.height !== current.attrs.height;
                    current = updated;
                    if (heightChanged) applyHeight(current.attrs.height);
                    if (idChanged) render();
                    return true;
                },
                // Keep ProseMirror from treating handle drags/keys as editor input
                // While live, ProseMirror must ignore every event from inside the canvas
                // (keys, pointer, clipboard) — this is the keyboard isolation.
                stopEvent: e => handle.contains(e.target) || (live && dom.contains(e.target)),
                ignoreMutation: () => true,
                destroy() { applyExpanded(false); drawingSession.release(ctx); unsubscribe(); revoke(); },            };
        };
    },

    /* One drawingId must live in exactly one node. Pasting a copy would
       make two nodes share (and overwrite) one drawing, so drop later
       duplicates. Step 3 can replace this with a server-side clone. */
    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('drawingUniqueGuard'),
                appendTransaction(transactions, _old, newState) {
                    if (!transactions.some(t => t.docChanged)) return null;
                    const seen = new Set();
                    const dupes = [];
                    newState.doc.descendants((n, pos) => {
                        if (n.type.name !== 'drawing') return;
                        const id = n.attrs.drawingId;
                        if (id != null && seen.has(id)) dupes.push({ pos, size: n.nodeSize });
                        else seen.add(id);
                    });
                    if (!dupes.length) return null;
                    const tr = newState.tr;
                    dupes.reverse().forEach(({ pos, size }) => tr.delete(pos, pos + size));
                    window.showToast?.('A drawing can’t be duplicated yet — the copy was skipped.', 'error');
                    return tr;
                },
            }),
        ];
    },
});

export default Drawing;